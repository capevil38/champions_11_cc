import json, math, os, datetime
import pandas as pd
import numpy as np

EXCEL_PATH = "Champions_11_CC_Master_DB.xlsx"
OUT_JSON = "data.json"

def to_jsonable(v):
    if isinstance(v, pd.Timestamp):
        return v.date().isoformat()
    if isinstance(v, datetime.datetime):
        return v.date().isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, datetime.time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        if v is None or (isinstance(v,float) and math.isnan(v)):
            return None
        return float(v)
    if pd.isna(v):
        return None
    return v

def df_to_records(df):
    return [{k: to_jsonable(v) for k,v in rec.items()} for rec in df.to_dict(orient="records")]

def main():
    players = pd.read_excel(EXCEL_PATH, sheet_name="Players")
    matches = pd.read_excel(EXCEL_PATH, sheet_name="Matches")
    batting = pd.read_excel(EXCEL_PATH, sheet_name="Batting")
    bowling = pd.read_excel(EXCEL_PATH, sheet_name="Bowling")
    fielding = pd.read_excel(EXCEL_PATH, sheet_name="Fielding")
    career = pd.read_excel(EXCEL_PATH, sheet_name="Player_Career_Stats")
    team = pd.read_excel(EXCEL_PATH, sheet_name="Team_Stats")

    fielding.columns = [c.strip() for c in fielding.columns]
    matches.columns = [c.strip() for c in matches.columns]

    batting["Strike Rate"] = pd.to_numeric(batting.get("Strike Rate"), errors="coerce")
    m = batting["Strike Rate"].isna() & batting["Balls"].fillna(0).gt(0)
    batting.loc[m, "Strike Rate"] = (batting.loc[m,"Runs"] / batting.loc[m,"Balls"] * 100).round(2)

    bowling["Economy"] = pd.to_numeric(bowling.get("Economy"), errors="coerce")
    m = bowling["Economy"].isna() & bowling["Overs"].fillna(0).gt(0)
    bowling.loc[m, "Economy"] = (bowling.loc[m,"Runs"] / bowling.loc[m,"Overs"]).round(2)

    # IDs as string
    for df in [players, batting, bowling, fielding, career]:
        if "PlayerID" in df.columns:
            df["PlayerID"] = df["PlayerID"].astype(str)

    for df in [matches, batting, bowling, fielding]:
        if "MatchID" in df.columns:
            df["MatchID"] = df["MatchID"].astype(int).astype(str)

    data = {
        "meta": {
            "team_name": "Champions 11 CC",
            "generated_on": datetime.date.today().isoformat(),
            "source_file": os.path.basename(EXCEL_PATH),
        },
        "team_stats": df_to_records(team),
        "players": df_to_records(players),
        "matches": df_to_records(matches),
        "batting": df_to_records(batting),
        "bowling": df_to_records(bowling),
        "fielding": df_to_records(fielding),
        "career": df_to_records(career),
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Wrote {OUT_JSON} ✅")

if __name__ == "__main__":
    main()
