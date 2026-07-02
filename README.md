# Champions 11 CC — Team Website

A custom FastAPI site for the team: public leaderboard + player profiles, with
an admin-only page (you) to log match stats. Built to run **entirely free,
permanently** — no trial credits, no credit card.

- **Hosting:** Hugging Face Spaces (free Docker tier)
- **Database:** Supabase (free Postgres tier)
- **Look:** custom "stadium scoreboard" theme — not a Streamlit/Gradio default

---

## 1. Create the free database (Supabase)

1. Go to https://supabase.com → sign up free → **New Project**.
2. Pick any name/region, set a database password (save it somewhere).
3. Once the project is ready: **Project Settings → Database → Connection string → URI**.
   Copy it — looks like:
   `postgresql://postgres:[PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`
4. That's it — the app creates its own tables automatically on first run.

*(Free Supabase projects pause after a week of no traffic — visiting the site instantly wakes it back up, no data lost.)*

## 2. Create the free host (Hugging Face Spaces)

1. Go to https://huggingface.co → sign up free.
2. **New Space** → pick a name (e.g. `champions11cc`) → **Docker** as the Space SDK → **Public** (or Private if you'd rather) → Create.
3. On the Space page, go to **Settings → Variables and secrets** and add these **secrets**:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase connection string from step 1 |
   | `ADMIN_PASSWORD` | a password only you know |
   | `SECRET_KEY` | any long random string (e.g. generate one at https://randomkeygen.com) |
4. Upload all the files in this folder to the Space (either drag-and-drop in the web UI's **Files** tab, or `git push` — the Space page shows you the git remote URL).
5. The Space will build automatically. Once it says **Running**, your site is live at:
   `https://huggingface.co/spaces/<your-username>/champions11cc`

## 3. Using it

- **Public:** anyone with the link sees the leaderboard and can click into player profiles.
- **Admin:** go to `/login`, enter your `ADMIN_PASSWORD`, then `/admin` to log a new innings or add a new squad member. Stays logged in via a secure cookie until you log out.

## Local development (optional)

No Supabase needed for local testing — it falls back to a local SQLite file automatically.

```bash
pip install -r requirements.txt
uvicorn main:app --reload
# open http://127.0.0.1:8000
```

Default local admin password is `changeme` — set `ADMIN_PASSWORD` as an environment
variable to change it, and always set a real one in production (Space secrets).

## Uploading a CricHeroes scorecard

From `/admin`, click **Upload CricHeroes Scorecard PDF** and drop in the
"Summary Scorecard" PDF CricHeroes generates after a match. It:

1. Reads the PDF and finds Champions 11 CC's batting innings specifically
   (ignores the opposition's batting and all bowling figures).
2. Matches each name to an existing squad member where possible, and
   suggests adding anyone new.
3. Shows you an editable review page — nothing is saved until you check it
   and click **Save All Innings**. You can fix any number, re-assign a name
   to a different player, or tick "skip" to leave a row out entirely.

This relies on `pdftotext` (from `poppler-utils`), which is installed in the
Docker image already — no extra setup needed on Hugging Face Spaces.

## Notes

- Every stat (average, strike rate, high score) is computed live from the innings
  log rather than stored/edited by hand — so it can never drift out of sync.
- To add bowling stats, wickets, or a match calendar later, this structure
  extends cleanly — just ask.
