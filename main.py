import os
from datetime import date

from fastapi import FastAPI, Request, Form, Depends, UploadFile, File
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

import database as db
import pdf_parser

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")

app = FastAPI(title="Champions 11 CC")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, https_only=False, same_site="lax")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.on_event("startup")
def startup():
    db.init_db()


def is_admin(request: Request) -> bool:
    return bool(request.session.get("is_admin"))


# ---------- Public pages ----------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    players = db.list_players_with_stats()
    return templates.TemplateResponse("index.html", {
        "request": request, "players": players, "admin": is_admin(request)
    })


@app.get("/player/{player_id}", response_class=HTMLResponse)
def player_profile(request: Request, player_id: int):
    player = db.get_player(player_id)
    if not player:
        return RedirectResponse("/")
    return templates.TemplateResponse("player.html", {
        "request": request, "player": player, "admin": is_admin(request)
    })


# ---------- Auth ----------

@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


@app.post("/login")
def login(request: Request, password: str = Form(...)):
    if password == ADMIN_PASSWORD:
        request.session["is_admin"] = True
        return RedirectResponse("/admin", status_code=303)
    return templates.TemplateResponse("login.html", {"request": request, "error": "Wrong password."})


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/")


# ---------- Admin ----------

@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    if not is_admin(request):
        return RedirectResponse("/login")
    players = db.list_players_with_stats()
    return templates.TemplateResponse("admin.html", {
        "request": request, "players": players, "today": date.today().isoformat(), "admin": True
    })


@app.post("/admin/add_innings")
def admin_add_innings(
    request: Request,
    player_id: int = Form(...),
    match_date: str = Form(...),
    opponent: str = Form(""),
    runs: int = Form(...),
    balls: int = Form(0),
    fours: int = Form(0),
    sixes: int = Form(0),
    not_out: bool = Form(False),
):
    if not is_admin(request):
        return RedirectResponse("/login")
    db.add_innings(player_id, match_date, opponent, runs, balls, fours, sixes, not_out)
    return RedirectResponse("/admin", status_code=303)


@app.post("/admin/add_player")
def admin_add_player(request: Request, name: str = Form(...), role: str = Form("")):
    if not is_admin(request):
        return RedirectResponse("/login")
    if not db.player_exists(name):
        db.add_player(name.strip(), role.strip())
    return RedirectResponse("/admin", status_code=303)


# ---------- Scorecard PDF upload ----------

@app.get("/admin/upload", response_class=HTMLResponse)
def upload_scorecard_form(request: Request):
    if not is_admin(request):
        return RedirectResponse("/login")
    return templates.TemplateResponse("upload_scorecard.html", {
        "request": request, "admin": True, "error": None
    })


@app.post("/admin/upload", response_class=HTMLResponse)
async def upload_scorecard(request: Request, scorecard: UploadFile = File(...)):
    if not is_admin(request):
        return RedirectResponse("/login")

    pdf_bytes = await scorecard.read()
    try:
        parsed = pdf_parser.parse_scorecard(pdf_bytes)
    except pdf_parser.ScorecardParseError as e:
        return templates.TemplateResponse("upload_scorecard.html", {
            "request": request, "admin": True, "error": str(e)
        })

    players = db.list_players()
    for row in parsed["rows"]:
        row["matched_player_id"] = db.find_player_id_by_name(row["clean_name"])

    return templates.TemplateResponse("review_scorecard.html", {
        "request": request, "admin": True,
        "match_date": parsed["match_date"] or date.today().isoformat(),
        "opponent": parsed["opponent"] or "",
        "rows": parsed["rows"],
        "players": players,
    })


@app.post("/admin/confirm_scorecard")
async def confirm_scorecard(request: Request):
    if not is_admin(request):
        return RedirectResponse("/login")

    form = await request.form()
    match_date = form.get("match_date")
    opponent = form.get("opponent", "")

    names = form.getlist("name")
    runs_list = form.getlist("runs")
    balls_list = form.getlist("balls")
    fours_list = form.getlist("fours")
    sixes_list = form.getlist("sixes")
    not_out_list = form.getlist("not_out")   # values = indices of rows the admin checked "not out" for
    player_choice_list = form.getlist("player_choice")
    skip_list = form.getlist("skip")  # indices of rows the admin chose to skip

    skip_set = set(skip_list)

    for i, name in enumerate(names):
        idx = str(i)
        if idx in skip_set:
            continue

        player_choice = player_choice_list[i]
        if player_choice.startswith("new:"):
            new_name = player_choice[4:] or name
            player_id = db.add_player(new_name.strip(), "")
        else:
            player_id = int(player_choice)

        not_out = idx in not_out_list

        db.add_innings(
            player_id=player_id,
            match_date=match_date,
            opponent=opponent,
            runs=int(runs_list[i]),
            balls=int(balls_list[i]),
            fours=int(fours_list[i]),
            sixes=int(sixes_list[i]),
            not_out=not_out,
        )

    return RedirectResponse("/admin", status_code=303)
