#!/usr/bin/env python3
"""
Add a What's New entry to assets/whats-new.js

Usage:
  python3 add_whats_new.py --title "Search within a book" \
    --desc "Click any book on the shelf..." \
    --link "/books/" \
    [--date 2026-10-16]

Criteria for What's New (user's rule):
- Big features that USERS will benefit from
- NOT internal changes (GitHub, Cloudflare, index rebuilds, bug fixes)
- Each entry needs a quick link to try it
- Keep desc to 1-2 sentences, plain language
"""

import argparse
import re
import sys
from datetime import date

def main():
    p = argparse.ArgumentParser(description="Add What's New entry")
    p.add_argument("--title", required=True, help="Feature title")
    p.add_argument("--desc", required=True, help="1-2 sentence description")
    p.add_argument("--link", required=True, help="Link to try it (e.g., /books/)")
    p.add_argument("--date", default=str(date.today()), help="Date (YYYY-MM-DD)")
    args = p.parse_args()

    path = "assets/whats-new.js"
    with open(path) as f:
        content = f.read()

    # Escape quotes in the strings
    title = args.title.replace('"', '\\"')
    desc = args.desc.replace('"', '\\"')
    link = args.link.replace('"', '\\"')

    entry = f'''  {{
    date: "{args.date}",
    title: "{title}",
    desc: "{desc}",
    link: "{link}"
  }},
'''

    # Insert after the opening bracket
    marker = "window.SAILIB_WHATS_NEW = [\n"
    if marker not in content:
        print("ERROR: Could not find insertion point", file=sys.stderr)
        sys.exit(1)

    content = content.replace(marker, marker + entry, 1)

    with open(path, "w") as f:
        f.write(content)

    print(f"Added: {args.title} ({args.date})")

if __name__ == "__main__":
    main()
