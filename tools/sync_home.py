#!/usr/bin/env python3
"""Regenerate home/index.html from the root index.html so /home/ can never drift.

The /home/ page is a full mirror of the root SaiLib home page. A relative
asset reference that works on / (e.g. "assets/x.js", "photos/assets/y.js")
resolves under /home/ on the mirror and 404s -- and because runSearch loads
all selected sources in one Promise.all, a single 404 aborts the ENTIRE
search on /home/ (2026-10-31 incident: three missed photos/assets/ refs).

RULE: never hand-edit home/index.html. Edit the root index.html, then run:
    python3 tools/sync_home.py
The script copies root -> home, rewrites every quote-prefixed relative
reference to a top-level directory (assets/, photos/, books/, ... -- computed
from the directories that actually exist here, so new dirs are covered) to a
root-absolute one, and FAILS unless:
  1. no relative top-level-dir reference remains in the output, and
  2. the output, with the added slashes stripped back out, is byte-identical
     to the root file (i.e. the script changed paths and nothing else).
Run it before EVERY push that touches index.html.
"""
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(BASE, "index.html")
HOME = os.path.join(BASE, "home", "index.html")

SKIP_DIRS = {"home", "__pycache__"}
DIRS = sorted(
    d for d in os.listdir(BASE)
    if os.path.isdir(os.path.join(BASE, d)) and d not in SKIP_DIRS
    and not d.startswith(".")
)
DIR_ALT = "|".join(re.escape(d) for d in DIRS)
# quote + optional ./ + top-level-dir + /
REWRITE_RE = re.compile(r"""(["'])(?:\./)?(%s)/""" % DIR_ALT)
# any remaining relative reference after rewriting (dir form)
LEFTOVER_DIR_RE = re.compile(r"""["'](?:\./)?(%s)/""" % DIR_ALT)
# bare relative file reference, e.g. "app.js" (no directory) -- also breaks on /home/
BARE_FILE_RE = re.compile(
    r"""["'](?:\./)?[A-Za-z0-9_.\-]+\.(?:js|css|png|jpe?g|webp|ico|json|html?|txt|xml|pdf)["']"""
)


def main():
    with open(ROOT, encoding="utf-8") as f:
        root = f.read()

    out, n = REWRITE_RE.subn(r"\1/\2/", root)
    if n == 0:
        print("sync_home: WARNING: no references rewritten (unexpected)")
    leftover = LEFTOVER_DIR_RE.findall(out)
    if leftover:
        print("sync_home: FAIL: relative dir references remain:", sorted(set(leftover)))
        return 1
    bare = BARE_FILE_RE.findall(out)
    if bare:
        print("sync_home: FAIL: bare relative file references remain:", sorted(set(bare)))
        return 1
    # Normalised round-trip: stripping the added slashes from BOTH sides must
    # reproduce the same text (i.e. the script changed paths and nothing else).
    # Both sides get the same treatment because root already contains some
    # root-absolute references of its own.
    strip_re = re.compile(r"""(["'])/(%s)/""" % DIR_ALT)
    if strip_re.sub(r"\1\2/", out) != strip_re.sub(r"\1\2/", root):
        print("sync_home: FAIL: normalised output differs from root (script changed "
              "more than paths). Refusing to write.")
        return 1
    with open(HOME, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"sync_home: OK: {n} references rewritten; home/index.html regenerated "
          f"from index.html and verified (no relative refs remain).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
