"""Convert Finished.xlsx into src/data/shows.json.

Usage: python scripts/convert.py "C:/Users/USER/Downloads/Finished.xlsx"
"""
import json
import re
import sys
from pathlib import Path

import openpyxl


def clean(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        v = v.replace("\xa0", " ").strip()
        return v or None
    return v


def year(v):
    v = clean(v)
    return v if isinstance(v, int) else None


def rating(v):
    v = clean(v)
    return float(v) if isinstance(v, (int, float)) else None


def main(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)

    # Finished: rank is row order (column A holds =A2+1 formulas)
    finished = []
    for row in list(wb["Finished"].iter_rows(values_only=True))[1:]:
        title = clean(row[1]) if len(row) > 1 else None
        if title is None:
            continue
        finished.append({
            "rank": len(finished) + 1,
            "title": str(title),
            "start": year(row[2]),
            "end": year(row[3]),
            "imdb": rating(row[4]),
        })

    discontinued = []
    for row in wb["Discontinued"].iter_rows(values_only=True):
        title = clean(row[0]) if row else None
        if title is not None:
            discontinued.append({"title": str(title)})

    # Wishlist cells look like "1. Planet Earth II (2016)"
    wishlist = []
    for row in wb["Wishlist"].iter_rows(values_only=True):
        text = clean(row[1]) if len(row) > 1 else None
        if text is None:
            continue
        m = re.match(r"^\d+\.\s*(.*?)\s*(?:\((\d{4})[^)]*\))?\s*$", str(text))
        title, yr = (m.group(1), m.group(2)) if m else (str(text), None)
        wishlist.append({
            "title": title,
            "start": int(yr) if yr else None,
            "imdb": rating(row[2]) if len(row) > 2 else None,
        })

    out = Path(__file__).resolve().parent.parent / "src" / "data" / "shows.json"
    out.write_text(json.dumps(
        {"finished": finished, "discontinued": discontinued, "wishlist": wishlist},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"finished={len(finished)} discontinued={len(discontinued)} wishlist={len(wishlist)} -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
