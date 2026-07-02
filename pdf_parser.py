"""
Parses a CricHeroes "Summary Scorecard" PDF export and extracts our team's
batting figures for one match.

Strategy: shell out to `pdftotext -layout`, which preserves CricHeroes'
table columns as wide whitespace gaps far more reliably than pure-Python
PDF text extractors do for this specific export format. Each batting row
is then split on runs of 2+ spaces to recover (No, Batsman, Status, R, B,
M, 4s, 6s, SR).
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
    """Strip role/hand tags like (c), (wk), (RHB), (LHB), (sub) from a name."""
    name = re.sub(r"\s*\([^)]*\)", "", raw_name)
    return re.sub(r"\s+", " ", name).strip()


def _is_not_out(status: str) -> bool:
    s = status.strip().lower()
    return s == "not out" or s.startswith("retired")


INNINGS_HEADER_RE = re.compile(
    r"^(?P<team>.+?)\s+\d+/\d+\s+\(\d+(?:\.\d+)?\s*Ov\)\s+\(\d(?:st|nd|rd|th)\s+Innings\)",
    re.MULTILINE,
)
DATE_RE = re.compile(r"Date\s+(\d{4}-\d{2}-\d{2})")


def parse_scorecard(pdf_bytes: bytes) -> dict:
    text = _pdf_to_layout_text(pdf_bytes)
    lines = text.splitlines()

    # --- match date ---
    date_match = DATE_RE.search(text)
    match_date = date_match.group(1) if date_match else None

    # --- find innings headers to identify team names ---
    headers = list(INNINGS_HEADER_RE.finditer(text))
    if not headers:
        raise ScorecardParseError(
            "Could not find any innings header (e.g. 'Team Name 119/10 (19.2 Ov) (1st Innings)'). "
            "This may not be a CricHeroes summary scorecard PDF."
        )

    our_header = None
    opponent = None
    for h in headers:
        team = h.group("team").strip()
        if OUR_TEAM_HINT in team.lower():
            our_header = h
        else:
            opponent = team

    if our_header is None:
        raise ScorecardParseError(
            "Could not find an innings where 'Champions 11 CC' batted in this scorecard."
        )

    # --- locate the line index of our team's innings header, then walk forward ---
    header_line_text = our_header.group(0)
    start_idx = None
    for i, line in enumerate(lines):
        if header_line_text.split("\n")[0] in line or line.strip().startswith(our_header.group("team").strip()):
            # confirm it's actually an innings header line, not e.g. a captain mention
            if re.match(INNINGS_HEADER_RE, line.strip()):
                start_idx = i
                break
    if start_idx is None:
        raise ScorecardParseError("Found the innings header in text but could not locate its line.")

    rows = []
    row_re = re.compile(r"^\s*\d+\s{2,}")
    for line in lines[start_idx + 1:]:
        stripped = line.strip()
        if stripped.startswith("Extras:") or stripped.startswith("Total:"):
            break
        if not row_re.match(line):
            continue

        fields = re.split(r"\s{2,}", stripped)
        # Expect: [No, Batsman, Status, R, B, M, 4s, 6s, SR]  (9 fields, ideal case)
        if len(fields) < 7:
            continue  # malformed row, skip rather than guess

        stat_fields = fields[-6:]
        middle = fields[1:-6]

        try:
            runs, balls, mins, fours, sixes = (int(x) for x in stat_fields[:5])
        except ValueError:
            continue  # not a real stat row (e.g. stray text) — skip

        if len(middle) >= 2:
            raw_name = middle[0]
            status = " ".join(middle[1:])
        elif len(middle) == 1:
            # Name and status ran together without a big gap — split on first
            # known dismissal keyword as a fallback.
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

    if not rows:
        raise ScorecardParseError(
            "Found Champions 11 CC's innings but couldn't parse any batting rows out of it."
        )

    return {
        "match_date": match_date,
        "opponent": opponent,
        "rows": rows,
    }
