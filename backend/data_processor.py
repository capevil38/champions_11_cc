"""
Utilities to parse and validate the Champions 11 CC Excel workbook.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from io import BytesIO
from typing import Any, Dict, Iterable, List, Mapping, Sequence

import openpyxl


SHEET_CONFIG = {
    "Matches": {
        "key": "matches",
        "required_columns": [
            "MatchID",
            "Opponent",
            "Team Runs",
            "Team Wickets Lost",
            "Opponent Runs",
            "Opponent Wickets Lost",
            "Date",
            "Venue",
        ],
    },
    "Players": {
        "key": "players",
        "required_columns": ["PlayerID", "Player Name"],
    },
    "Batting": {
        "key": "batting",
        "required_columns": ["MatchID", "PlayerID", "Runs"],
    },
    "Bowling": {
        "key": "bowling",
        "required_columns": ["MatchID", "PlayerID", "Overs"],
        "rename": {
            "Runs": "Bowl Runs",
            "Wickets": "Wkts",
            "Dots": "Dot Balls",
            "Fours": "Fours Conceded",
            "Sixes": "Sixes Conceded",
        },
    },
    "Fielding": {
        "key": "fielding",
        "required_columns": ["MatchID", "PlayerID"],
        "rename": {" PlayerID": "PlayerID"},
    },
    "Player_Career_Stats": {
        "key": "player_career_stats",
        "required_columns": ["PlayerID", "Player Name", "Matches"],
    },
    "Team_Stats": {
        "key": "team_stats",
        "required_columns": ["Matches", "Won", "Lost"],
    },
}

DEFAULT_DATASET_KEYS = [
    "matches",
    "players",
    "batting",
    "bowling",
    "fielding",
    "player_career_stats",
    "team_stats",
]


def clean_value(value: Any) -> Any:
    """Normalize workbook cell values."""
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.lower() in {"", "na", "n/a", "null", "-"}:
            return None
        return stripped
    if isinstance(value, datetime):
        if value.time() == time(0, 0):
            return value.date().isoformat()
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, (float, int)):
        # openpyxl returns floats for everything; trim trailing .0
        if isinstance(value, float):
            rounded = round(value, 2)
            if rounded.is_integer():
                return int(rounded)
            return rounded
        return value
    return value


def _ensure_columns(headers: Sequence[str], required: Sequence[str], sheet_name: str) -> None:
    missing = [col for col in required if col not in headers]
    if missing:
        raise ValueError(
            f"Sheet '{sheet_name}' is missing required columns: {', '.join(missing)}."
        )


def sheet_to_dicts(
    rows: Sequence[Sequence[Any]],
    sheet_name: str,
    rename_map: Mapping[str, str] | None = None,
    required_columns: Sequence[str] | None = None,
) -> List[Dict[str, Any]]:
    rename_map = rename_map or {}
    if not rows:
        return []
    headers = []
    for header in rows[0]:
        if isinstance(header, str):
            header = header.strip()
        headers.append(rename_map.get(header, header))
    if required_columns:
        _ensure_columns(headers, required_columns, sheet_name)
    data_rows = []
    for row in rows[1:]:
        entry: Dict[str, Any] = {}
        has_values = False
        for header, value in zip(headers, row):
            if not header:
                continue
            cleaned = clean_value(value)
            if cleaned is not None:
                has_values = True
            entry[header] = cleaned
        if has_values:
            data_rows.append(entry)
    return data_rows


def dataset_template() -> Dict[str, List[Dict[str, Any]]]:
    return {key: [] for key in DEFAULT_DATASET_KEYS}


def parse_workbook_bytes(contents: bytes) -> Dict[str, Any]:
    """Parse workbook bytes into the JSON structure used by the site."""
    stream = BytesIO(contents)
    try:
        workbook = openpyxl.load_workbook(stream, data_only=True)
    except Exception as exc:
        raise ValueError("Unable to read Excel workbook.") from exc
    dataset = dataset_template()
    for sheet_name, cfg in SHEET_CONFIG.items():
        if sheet_name not in workbook:
            raise ValueError(f"Workbook is missing required sheet '{sheet_name}'.")
        ws = workbook[sheet_name]
        rows = list(ws.values)
        parsed = sheet_to_dicts(
            rows,
            sheet_name,
            rename_map=cfg.get("rename"),
            required_columns=cfg.get("required_columns"),
        )
        dataset[cfg["key"]] = parsed
    validate_dataset(dataset)
    return dataset


def validate_dataset(dataset: Dict[str, Any]) -> None:
    """Ensure match/player references are consistent."""
    matches = {str(item["MatchID"]) for item in dataset.get("matches", []) if item.get("MatchID") is not None}
    players = {item["PlayerID"] for item in dataset.get("players", []) if item.get("PlayerID")}
    if not matches:
        raise ValueError("Matches sheet must include at least one entry.")
    if not players:
        raise ValueError("Players sheet must include at least one entry.")

    for section in ("batting", "bowling", "fielding"):
        for entry in dataset.get(section, []):
            match_id = entry.get("MatchID")
            player_id = entry.get("PlayerID")
            if match_id is None or str(match_id) not in matches:
                raise ValueError(f"{section.title()} entry references unknown MatchID '{match_id}'.")
            if not player_id or player_id not in players:
                raise ValueError(f"{section.title()} entry references unknown PlayerID '{player_id}'.")

    # Ensure career stats align with players table
    career_ids = {item["PlayerID"] for item in dataset.get("player_career_stats", []) if item.get("PlayerID")}
    missing_stats = players - career_ids
    if missing_stats:
        raise ValueError(
            "Player_Career_Stats sheet is missing records for: " + ", ".join(sorted(missing_stats))
        )
