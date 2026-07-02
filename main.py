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

IS_PRODUCTION = bool(os.environ.get("DATABASE_URL"))  # same signal database.py uses

app = FastAPI(title="Champions 11 CC")
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    https_only=IS_PRODUCTION,
    same_site="none" if IS_PRODUCTION else "lax",
)
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
    bowlers = db.list_bowlers_with_stats()
    fielders = db.list_fielders_with_stats()
    return templates.TemplateResponse("index.html", {
        "request": request, "players": players, "bowlers": bowlers,
        "fielders": fielders, "admin": is_admin(request)
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


@app.post("/admin/add_bowling")
def admin_add_bowling(
    request: Request,
    player_id: int = Form(...),
    match_date: str = Form(...),
    opponent: str = Form(""),
    overs: str = Form("0"),
    maidens: int = Form(0),
    runs_conceded: int = Form(0),
    wickets: int = Form(0),
    wides: int = Form(0),
    no_balls: int = Form(0),
):
    if not is_admin(request):
        return RedirectResponse("/login")
    balls_bowled = db.overs_to_balls(overs)
    db.add_bowling(player_id, match_date, opponent, balls_bowled, maidens, runs_conceded, wickets, wides, no_balls)
    return RedirectResponse("/admin", status_code=303)


@app.post("/admin/add_fielding")
def admin_add_fielding(
    request: Request,
    player_id: int = Form(...),
    match_date: str = Form(...),
    opponent: str = Form(""),
    catches: int = Form(0),
    run_outs: int = Form(0),
    stumpings: int = Form(0),
):
    if not is_admin(request):
        return RedirectResponse("/login")
    db.add_fielding(player_id, match_date, opponent, catches, run_outs, stumpings)
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
    for row in parsed["batting_rows"]:
        row["matched_player_id"] = db.find_player_id_by_name(row["clean_name"])
    for row in parsed["bowling_rows"]:
        row["matched_player_id"] = db.find_player_id_by_name(row["clean_name"])
    for row in parsed["fielding_rows"]:
        row["matched_player_id"] = db.find_player_id_by_name(row["clean_name"])

    return templates.TemplateResponse("review_scorecard.html", {
        "request": request, "admin": True,
        "match_date": parsed["match_date"] or date.today().isoformat(),
        "opponent": parsed["opponent"] or "",
        "batting_rows": parsed["batting_rows"],
        "bowling_rows": parsed["bowling_rows"],
        "fielding_rows": parsed["fielding_rows"],
        "players": players,
    })


@app.post("/admin/confirm_scorecard")
async def confirm_scorecard(request: Request):
    if not is_admin(request):
        return RedirectResponse("/login")

    form = await request.form()
    match_date = form.get("match_date")
    opponent = form.get("opponent", "")

    def resolve_player(choice, fallback_name):
        if choice.startswith("new:"):
            new_name = (choice[4:] or fallback_name).strip()
            existing_id = db.find_player_id_by_name(new_name)
            if existing_id:
                return existing_id
            return db.add_player(new_name, "")
        return int(choice)

    # --- Batting ---
    bat_names = form.getlist("bat_name")
    bat_runs = form.getlist("bat_runs")
    bat_balls = form.getlist("bat_balls")
    bat_fours = form.getlist("bat_fours")
    bat_sixes = form.getlist("bat_sixes")
    bat_not_out = set(form.getlist("bat_not_out"))
    bat_player_choice = form.getlist("bat_player_choice")
    bat_skip = set(form.getlist("bat_skip"))

    for i, name in enumerate(bat_names):
        idx = str(i)
        if idx in bat_skip:
            continue
        player_id = resolve_player(bat_player_choice[i], name)
        db.add_innings(
            player_id=player_id, match_date=match_date, opponent=opponent,
            runs=int(bat_runs[i]), balls=int(bat_balls[i]),
            fours=int(bat_fours[i]), sixes=int(bat_sixes[i]),
            not_out=idx in bat_not_out,
        )

    # --- Bowling ---
    bowl_names = form.getlist("bowl_name")
    bowl_overs = form.getlist("bowl_overs")
    bowl_maidens = form.getlist("bowl_maidens")
    bowl_runs = form.getlist("bowl_runs")
    bowl_wickets = form.getlist("bowl_wickets")
    bowl_wides = form.getlist("bowl_wides")
    bowl_noballs = form.getlist("bowl_noballs")
    bowl_player_choice = form.getlist("bowl_player_choice")
    bowl_skip = set(form.getlist("bowl_skip"))

    for i, name in enumerate(bowl_names):
        idx = str(i)
        if idx in bowl_skip:
            continue
        player_id = resolve_player(bowl_player_choice[i], name)
        balls_bowled = db.overs_to_balls(bowl_overs[i])
        db.add_bowling(
            player_id=player_id, match_date=match_date, opponent=opponent,
            balls_bowled=balls_bowled, maidens=int(bowl_maidens[i]),
            runs_conceded=int(bowl_runs[i]), wickets=int(bowl_wickets[i]),
            wides=int(bowl_wides[i]), no_balls=int(bowl_noballs[i]),
        )

    # --- Fielding ---
    field_names = form.getlist("field_name")
    field_catches = form.getlist("field_catches")
    field_runouts = form.getlist("field_runouts")
    field_stumpings = form.getlist("field_stumpings")
    field_player_choice = form.getlist("field_player_choice")
    field_skip = set(form.getlist("field_skip"))

    for i, name in enumerate(field_names):
        idx = str(i)
        if idx in field_skip:
            continue
        player_id = resolve_player(field_player_choice[i], name)
        db.add_fielding(
            player_id=player_id, match_date=match_date, opponent=opponent,
            catches=int(field_catches[i]), run_outs=int(field_runouts[i]),
            stumpings=int(field_stumpings[i]),
        )

    return RedirectResponse("/admin", status_code=303)