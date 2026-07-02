"""
Database layer.

Uses Postgres (Supabase) when DATABASE_URL is set (production / Hugging Face Space),
falls back to a local SQLite file when it isn't (local dev, no setup needed).

Design note: instead of storing pre-computed career stats (matches, average,
strike rate...) like the original app did, we store one row per innings and
compute every aggregate with SQL. That removes an entire category of bugs
(stale averages, wrong high score after an edit, etc.) for free.
"""
import os
import sqlite3
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL")  # postgres://... (Supabase)
SQLITE_PATH = os.environ.get("SQLITE_PATH", "champions11.db")

USE_POSTGRES = bool(DATABASE_URL)

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras


@contextmanager
def get_conn():
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield conn
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()


def ph():
    """Parameter placeholder — Postgres uses %s, SQLite uses ?."""
    return "%s" if USE_POSTGRES else "?"


def init_db():
    with get_conn() as conn:
        cur = conn.cursor()
        if USE_POSTGRES:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS players (
                    id SERIAL PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    role TEXT DEFAULT '',
                    joined_on DATE DEFAULT CURRENT_DATE
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS innings (
                    id SERIAL PRIMARY KEY,
                    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                    match_date DATE NOT NULL,
                    opponent TEXT DEFAULT '',
                    runs INTEGER NOT NULL,
                    balls INTEGER NOT NULL DEFAULT 0,
                    fours INTEGER NOT NULL DEFAULT 0,
                    sixes INTEGER NOT NULL DEFAULT 0,
                    not_out BOOLEAN NOT NULL DEFAULT FALSE
                )
            """)
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    role TEXT DEFAULT '',
                    joined_on TEXT DEFAULT (date('now'))
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS innings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                    match_date TEXT NOT NULL,
                    opponent TEXT DEFAULT '',
                    runs INTEGER NOT NULL,
                    balls INTEGER NOT NULL DEFAULT 0,
                    fours INTEGER NOT NULL DEFAULT 0,
                    sixes INTEGER NOT NULL DEFAULT 0,
                    not_out INTEGER NOT NULL DEFAULT 0
                )
            """)
        conn.commit()

        # Seed the squad once, if empty
        cur.execute("SELECT COUNT(*) AS c FROM players")
        row = cur.fetchone()
        count = row["c"] if isinstance(row, dict) else row[0]
        if count == 0:
            seed = [
                ("Sriram A", "Opening batsman"),
                ("Jeeva A", "Middle-order batsman"),
                ("Shivaganesh", "All-rounder"),
                ("Sanjay V", "Wicketkeeper-batsman"),
                ("Jai", "Right-arm fast bowler, right-hand bat"),
                ("Manoj", "Spin bowler"),
            ]
            p = ph()
            for name, role in seed:
                cur.execute(f"INSERT INTO players (name, role) VALUES ({p}, {p})", (name, role))
            conn.commit()


def list_players_with_stats():
    """Returns every player with aggregate career stats computed from innings."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                p.id, p.name, p.role,
                COUNT(i.id) AS innings_count,
                COALESCE(SUM(i.runs), 0) AS runs,
                COALESCE(SUM(CASE WHEN i.not_out THEN 1 ELSE 0 END), 0) AS not_outs,
                COALESCE(MAX(i.runs), 0) AS high_score,
                COALESCE(SUM(i.balls), 0) AS balls
            FROM players p
            LEFT JOIN innings i ON i.player_id = p.id
            GROUP BY p.id, p.name, p.role
            ORDER BY runs DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]

    for r in rows:
        dismissals = r["innings_count"] - r["not_outs"]
        r["average"] = round(r["runs"] / dismissals, 2) if dismissals > 0 else (float(r["runs"]) if r["runs"] else 0.0)
        r["strike_rate"] = round(r["runs"] * 100 / r["balls"], 2) if r["balls"] > 0 else 0.0
        r["is_avg_undefined"] = dismissals == 0 and r["innings_count"] > 0
    return rows


def get_player(player_id):
    with get_conn() as conn:
        cur = conn.cursor()
        p = ph()
        cur.execute(f"SELECT id, name, role FROM players WHERE id = {p}", (player_id,))
        row = cur.fetchone()
        if not row:
            return None
        player = dict(row)
        cur.execute(
            f"SELECT match_date, opponent, runs, balls, fours, sixes, not_out "
            f"FROM innings WHERE player_id = {p} ORDER BY match_date DESC",
            (player_id,),
        )
        player["innings"] = [dict(r) for r in cur.fetchall()]
    return player


def list_players():
    """All players as [{id, name}], sorted alphabetically — for dropdowns."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM players ORDER BY name ASC")
        return [dict(r) for r in cur.fetchall()]


def find_player_id_by_name(name):
    """Case-insensitive exact match. Returns id or None."""
    with get_conn() as conn:
        cur = conn.cursor()
        p = ph()
        cur.execute(f"SELECT id FROM players WHERE LOWER(name) = LOWER({p})", (name.strip(),))
        row = cur.fetchone()
        return row["id"] if row else None


def add_player(name, role):
    with get_conn() as conn:
        cur = conn.cursor()
        p = ph()
        if USE_POSTGRES:
            cur.execute(f"INSERT INTO players (name, role) VALUES ({p}, {p}) RETURNING id", (name, role))
            new_id = cur.fetchone()["id"]
        else:
            cur.execute(f"INSERT INTO players (name, role) VALUES ({p}, {p})", (name, role))
            new_id = cur.lastrowid
        conn.commit()
        return new_id


def player_exists(name):
    with get_conn() as conn:
        cur = conn.cursor()
        p = ph()
        cur.execute(f"SELECT id FROM players WHERE LOWER(name) = LOWER({p})", (name,))
        return cur.fetchone() is not None


def add_innings(player_id, match_date, opponent, runs, balls, fours, sixes, not_out):
    with get_conn() as conn:
        cur = conn.cursor()
        p = ph()
        cur.execute(
            f"""INSERT INTO innings (player_id, match_date, opponent, runs, balls, fours, sixes, not_out)
                VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})""",
            (player_id, match_date, opponent, runs, balls, fours, sixes, not_out),
        )
        conn.commit()
