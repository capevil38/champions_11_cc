"""
Parses a CricHeroes "Summary Scorecard" PDF export for one match and extracts
Champions 11 CC's batting, bowling, and fielding figures.

Strategy: shell out to `pdftotext -layout`, which preserves CricHeroes' table
columns as wide whitespace gaps far more reliably than pure-Python PDF text
extractors do for this specific export format.

Key insight about scorecard structure: each innings section lists the
batting team's batsmen, followed by the *bowling* team's bowling figures.
So:
  - Our BATTING comes from the innings section where we batted.
  - Our BOWLING comes from the bowler table inside the *opponent's* innings
    section (since we were bowling while they batted).
  - Our FIELDING (catches/stumpings/run-outs) comes from the dismissal text
    of the opponent's batting rows in that same section.
"""
import re
import subprocess
import tempfile

OUR_TEAM_HINT = "champions 11"  # case-insensitive substring used to find our team


class ScorecardParseError(Exception):
    pass


def _pdf_to_layout_text(pdf_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(pdf_bytes)
        f.flush()
        result = subprocess.run(
            ["pdftotext", "-layout", f.name, "-"],
            capture_output=True, text=True, timeout=30,
        )
    if result.returncode != 0:
        raise ScorecardParseError(f"pdftotext failed: {result.stderr.strip()}")
    return result.stdout


def _clean_name(raw_name: str) -> str:
    """Strip role/hand tags like (c), (wk), (RHB), (LHB), (sub) and the † keeper mark."""
    name = re.sub(r"\s*\([^)]*\)", "", raw_name)
    name = name.replace("†", "")
    return re.sub(r"\s+", " ", name).strip()


def _is_not_out(status: str) -> bool:
    s = status.strip().lower()
    return s == "not out" or s.startswith("retired")


def overs_to_balls(overs_str: str) -> int:
    """CricHeroes overs like '3.0' or '0.2' -> total balls bowled (2nd digit is balls, not decimal)."""
    parts = str(overs_str).split(".")
    whole = int(parts[0]) if parts[0] else 0
    frac = int(parts[1]) if len(parts) > 1 and parts[1] else 0
    return whole * 6 + frac


def balls_to_overs_display(balls: int) -> str:
    return f"{balls // 6}.{balls % 6}"


INNINGS_HEADER_RE = re.compile(
    r"^(?P<team>.+?)\s+\d+/\d+\s+\(\d+(?:\.\d+)?\s*Ov\)\s+\(\d(?:st|nd|rd|th)\s+Innings\)",
    re.MULTILINE,
)
DATE_RE = re.compile(r"Date\s+(\d{4}-\d{2}-\d{2})")

_ROW_START_RE = re.compile(r"^\s*\d+\s{2,}")


def _find_header_line_index(lines, header_match):
    header_team = header_match.group("team").strip()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(header_team) and re.match(INNINGS_HEADER_RE, stripped):
            return i
    return None


def _parse_batting_rows(lines, start_idx):
    """Parse numbered batting rows starting after an innings header line.
    Returns (rows, index_of_line_after_the_block)."""
    rows = []
    i = start_idx + 1
    for i in range(start_idx + 1, len(lines)):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("Extras:") or stripped.startswith("Total:"):
            return rows, i
        if not _ROW_START_RE.match(line):
            continue

        fields = re.split(r"\s{2,}", stripped)
        if len(fields) < 7:
            continue

        stat_fields = fields[-6:]
        middle = fields[1:-6]

        try:
            runs, balls, mins, fours, sixes = (int(x) for x in stat_fields[:5])
        except ValueError:
            continue

        if len(middle) >= 2:
            raw_name = middle[0]
            status = " ".join(middle[1:])
        elif len(middle) == 1:
            combined = middle[0]
            m = re.search(r"\b(not out|retired|c&b|c\s|b\s|st\s|run out|lbw)\b", combined)
            if m:
                raw_name = combined[:m.start()].strip()
                status = combined[m.start():].strip()
            else:
                raw_name, status = combined, ""
        else:
            continue

        clean_name = _clean_name(raw_name)
        if not clean_name:
            continue

        rows.append({
            "raw_name": raw_name,
            "clean_name": clean_name,
            "status": status,
            "runs": runs,
            "balls": balls,
            "fours": fours,
            "sixes": sixes,
            "not_out": _is_not_out(status),
        })
    return rows, len(lines)


def _parse_bowling_rows(lines, start_idx):
    """Parse the bowler table that follows a batting block (after Extras/Total lines)."""
    rows = []
    in_table = False
    for i in range(start_idx, len(lines)):
        stripped = lines[i].strip()
        if not in_table:
            if stripped.startswith("No") and "Bowler" in stripped:
                in_table = True
            continue
        if stripped.startswith("To Bat") or stripped == "" and rows:
            # blank line right after we've started collecting rows likely ends the table,
            # but CricHeroes sometimes has blank spacer lines between rows too — only
            # stop on "To Bat" or "Fall of Wickets" to be safe.
            pass
        if stripped.startswith("To Bat") or stripped.startswith("Fall of Wickets"):
            break
        if not _ROW_START_RE.match(lines[i]):
            continue

        fields = re.split(r"\s{2,}", stripped)
        # [No, Bowler, O, M, R, W, 0s, 4s, 6s, WD, NB, Eco]
        if len(fields) < 6:
            continue
        raw_name = fields[1]
        try:
            overs = fields[2]
            maidens = int(fields[3])
            runs_conceded = int(fields[4])
            wickets = int(fields[5])
        except (ValueError, IndexError):
            continue

        def _safe_int(lst, idx):
            try:
                return int(lst[idx])
            except (IndexError, ValueError):
                return 0

        wides = _safe_int(fields, 9)
        no_balls = _safe_int(fields, 10)

        clean_name = _clean_name(raw_name)
        if not clean_name:
            continue

        rows.append({
            "raw_name": raw_name,
            "clean_name": clean_name,
            "overs": overs,
            "balls_bowled": overs_to_balls(overs),
            "maidens": maidens,
            "runs_conceded": runs_conceded,
            "wickets": wickets,
            "wides": wides,
            "no_balls": no_balls,
        })
    return rows


_FIELDER_PATTERNS = [
    ("catch", re.compile(r"^c&b\s+(?P<name>.+)$", re.IGNORECASE)),          # caught & bowled -> bowler himself
    ("catch", re.compile(r"^c\s+(?P<name>.+?)\s+b\s+.+$", re.IGNORECASE)),   # caught by fielder
    ("stumping", re.compile(r"^st\s+(?P<name>.+?)\s+b\s+.+$", re.IGNORECASE)),
    ("run_out", re.compile(r"^run\s*out\s+(?P<name>.+)$", re.IGNORECASE)),
]


def _extract_fielding_from_status(status: str):
    """Returns (dismissal_type, clean_fielder_name) or None if no fielder is credited."""
    s = status.strip()
    for dismissal_type, pattern in _FIELDER_PATTERNS:
        m = pattern.match(s)
        if m:
            name = _clean_name(m.group("name"))
            if name:
                return dismissal_type, name
    return None


def _aggregate_fielding(batting_rows):
    """batting_rows here are the OPPONENT's batting rows — we pull fielder credits
    (ours) out of their dismissal text."""
    summary = {}
    for row in batting_rows:
        result = _extract_fielding_from_status(row["status"])
        if not result:
            continue
        dismissal_type, fielder_name = result
        key = fielder_name
        if key not in summary:
            summary[key] = {"clean_name": fielder_name, "catches": 0, "stumpings": 0, "run_outs": 0}
        if dismissal_type == "catch":
            summary[key]["catches"] += 1
        elif dismissal_type == "stumping":
            summary[key]["stumpings"] += 1
        elif dismissal_type == "run_out":
            summary[key]["run_outs"] += 1
    return list(summary.values())


def parse_scorecard(pdf_bytes: bytes) -> dict:
    text = _pdf_to_layout_text(pdf_bytes)
    lines = text.splitlines()

    date_match = DATE_RE.search(text)
    match_date = date_match.group(1) if date_match else None

    headers = list(INNINGS_HEADER_RE.finditer(text))
    if not headers:
        raise ScorecardParseError(
            "Could not find any innings header (e.g. 'Team Name 119/10 (19.2 Ov) (1st Innings)'). "
            "This may not be a CricHeroes summary scorecard PDF."
        )

    our_header = None
    opponent_header = None
    opponent = None
    for h in headers:
        team = h.group("team").strip()
        if OUR_TEAM_HINT in team.lower():
            our_header = h
        else:
            opponent_header = h
            opponent = team

    if our_header is None:
        raise ScorecardParseError(
            "Could not find an innings where 'Champions 11 CC' batted in this scorecard."
        )

    our_start_idx = _find_header_line_index(lines, our_header)
    if our_start_idx is None:
        raise ScorecardParseError("Found the innings header in text but could not locate its line.")

    batting_rows, _ = _parse_batting_rows(lines, our_start_idx)
    if not batting_rows:
        raise ScorecardParseError(
            "Found Champions 11 CC's innings but couldn't parse any batting rows out of it."
        )

    bowling_rows = []
    fielding_rows = []
    if opponent_header is not None:
        opp_start_idx = _find_header_line_index(lines, opponent_header)
        if opp_start_idx is not None:
            opp_batting_rows, after_batting_idx = _parse_batting_rows(lines, opp_start_idx)
            bowling_rows = _parse_bowling_rows(lines, after_batting_idx)
            fielding_rows = _aggregate_fielding(opp_batting_rows)

    return {
        "match_date": match_date,
        "opponent": opponent,
        "batting_rows": batting_rows,
        "bowling_rows": bowling_rows,
        "fielding_rows": fielding_rows,
    }