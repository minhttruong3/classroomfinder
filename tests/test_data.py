"""Data-accuracy tests for the scraped building JSON files.

Run from the repo root:  python3 -m unittest discover -s tests -v

The first group checks the files on their own (schema, value ranges, no
placeholders). The second group re-fetches BU's class search API
independently and checks the files faithfully reflect the source.
"""

import json
import math
import re
import unittest
from collections import Counter
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
TERM = "2268"
GROUPS = [
    "CDS", "QST", "CGS", "COM", "ENG", "CAS", "MET", "GRS", "CFA",
    "SAR", "SDM", "SHA", "LAW", "MED", "SPH", "SSW", "STH", "WED",
]
API = (
    "https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/"
    "WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch"
    "?institution=BU001&term={term}&acad_group={group}&page={page}"
)
HEADERS = {"User-agent": "Mozilla/5.0"}
DAYS_RE = re.compile(r"^(Mo|Tu|We|Th|Fr|Sa|Su)+$")
KEYS = {"facility_id", "days", "start_time", "end_time"}


def load(group):
    with open(ROOT / f"{group}.json") as f:
        return json.load(f)


def key(m):
    return (m["facility_id"], m["days"], round(m["start_time"], 4), round(m["end_time"], 4))


def parse_time(s):
    """'09.05.00.000000' -> 9.0833..."""
    parts = s.split(".")
    return int(parts[0]) + int(parts[1]) / 60


class FileIntegrity(unittest.TestCase):
    def test_all_files_exist_and_are_lists(self):
        for g in GROUPS:
            with self.subTest(group=g):
                self.assertIsInstance(load(g), list)

    def test_schema(self):
        for g in GROUPS:
            for i, m in enumerate(load(g)):
                with self.subTest(group=g, index=i):
                    self.assertEqual(set(m), KEYS)
                    self.assertIsInstance(m["facility_id"], str)
                    self.assertTrue(m["facility_id"].strip())
                    self.assertRegex(m["days"], DAYS_RE)
                    self.assertIsInstance(m["start_time"], (int, float))
                    self.assertIsInstance(m["end_time"], (int, float))

    def test_time_ranges(self):
        for g in GROUPS:
            for i, m in enumerate(load(g)):
                with self.subTest(group=g, index=i, meeting=m):
                    self.assertGreater(m["start_time"], 0, "0 means clean_time() failed to parse")
                    self.assertLess(m["start_time"], m["end_time"])
                    self.assertLessEqual(m["end_time"], 24)

    def test_no_placeholder_rooms(self):
        for g in GROUPS:
            for m in load(g):
                with self.subTest(group=g, meeting=m):
                    self.assertNotIn(m["facility_id"], ("TBA", "NO ROOM"))
                    self.assertNotEqual(m["days"], "TBA")

    def test_days_have_no_duplicate_letters_pairs(self):
        for g in GROUPS:
            for m in load(g):
                pairs = re.findall(r"..", m["days"])
                with self.subTest(group=g, meeting=m):
                    self.assertEqual(len(pairs), len(set(pairs)))

    def test_groups_are_populated(self):
        """SDM and LAW can legitimately be empty (rooms not assigned yet);
        every other group must have data."""
        for g in GROUPS:
            if g in ("SDM", "LAW"):
                continue
            with self.subTest(group=g):
                self.assertGreater(len(load(g)), 0)


def fetch_group(group, pages=None):
    """Return (raw class dicts, page count) for a group.

    pages=None fetches every page; pages="sample" fetches first, middle and
    last page; otherwise an explicit iterable of page numbers.
    """
    first = requests.get(API.format(term=TERM, group=group, page=1), headers=HEADERS, timeout=30).json()
    total = int(first["pageCount"])
    if pages is None:
        wanted = range(1, total + 1)
    elif pages == "sample":
        wanted = sorted({1, max(1, total // 2), total})
    else:
        wanted = [p for p in pages if p <= total]
    classes = []
    for p in wanted:
        data = first if p == 1 else requests.get(
            API.format(term=TERM, group=group, page=p), headers=HEADERS, timeout=30
        ).json()
        classes.extend(data.get("classes", []))
    return classes, total


def expected_from_raw(classes):
    """Independent re-implementation of the scraper's filtering/parsing."""
    out = []
    for c in classes:
        meetings = c.get("meetings") or []
        if not meetings:
            continue
        m = meetings[0]
        if m["facility_id"] in ("NO ROOM", "TBA") or m["days"] == "TBA":
            continue
        out.append(
            {
                "facility_id": m["facility_id"],
                "days": m["days"],
                "start_time": parse_time(m["start_time"]),
                "end_time": parse_time(m["end_time"]),
            }
        )
    return out


class MatchesLiveSource(unittest.TestCase):
    """Fully re-fetch small groups and compare exactly (as multisets)."""

    SMALL_GROUPS = ["CGS", "SHA", "WED", "SSW", "STH", "LAW", "SDM"]

    @classmethod
    def setUpClass(cls):
        try:
            r = requests.get(
                API.format(term=TERM, group="SHA", page=1), headers=HEADERS, timeout=30
            )
            r.raise_for_status()
            r.json()
        except (requests.RequestException, ValueError) as e:
            raise unittest.SkipTest(f"BU class search API unavailable: {e}")

    def test_small_groups_match_source_exactly(self):
        for g in self.SMALL_GROUPS:
            with self.subTest(group=g):
                raw, _ = fetch_group(g)
                expected = Counter(key(m) for m in expected_from_raw(raw))
                actual = Counter(key(m) for m in load(g))
                self.assertEqual(
                    expected - actual, Counter(), f"{g}: meetings in source missing from file"
                )
                self.assertEqual(
                    actual - expected, Counter(), f"{g}: meetings in file not in source"
                )

    def test_large_groups_sampled_pages_present_in_file(self):
        for g in ["CAS", "MED", "ENG", "CFA", "COM", "QST"]:
            with self.subTest(group=g):
                raw, _ = fetch_group(g, pages="sample")
                actual = Counter(key(m) for m in load(g))
                missing = [
                    key(m) for m in expected_from_raw(raw) if actual[key(m)] == 0
                ]
                self.assertEqual(missing, [], f"{g}: sampled source meetings missing from file")

    def test_group_total_page_count_is_plausible(self):
        """Guard against a truncated scrape: file size should track page count
        (each page holds up to 100 classes)."""
        for g in ["CAS", "MED", "ENG"]:
            with self.subTest(group=g):
                _, total = fetch_group(g, pages=[1])
                self.assertGreater(len(load(g)), (total - 1) * 100 * 0.4)


class TimeParsing(unittest.TestCase):
    def test_parse_time_samples(self):
        self.assertTrue(math.isclose(parse_time("09.05.00.000000"), 9 + 5 / 60))
        self.assertTrue(math.isclose(parse_time("13.30.00.000000"), 13.5))
        self.assertTrue(math.isclose(parse_time("18.25.00.000000"), 18 + 25 / 60))


if __name__ == "__main__":
    unittest.main()
