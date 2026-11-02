#!/usr/bin/env python3
"""Parity check: every digest on the digests page must be searchable from
the home pages via assets/sailib-digest-items.js.

Usage:
  python3 tools/check_digest_index.py
      Checks ALL digests for presence (>= 1 index item), hash correctness
      (index h == the digest page's computed hash), and orphans (index
      items whose digest no longer exists). Digests whose sections are
      only partially indexed are listed as WARNINGS (older readalongs
      predate the per-section rule) and do NOT fail the run.
      Exit 0 = no errors, 1 = errors found.

  python3 tools/check_digest_index.py "Digest Name" [...]
      STRICT mode for the named digests only: fails if any major section
      of a named digest lacks an index entry, if a named digest is
      missing from the index, or if its index hash is wrong.
      Use this when ADDING a digest: the new digest must pass strict
      before the push.

Why this exists: the home pages (index.html and home/index.html) search
digests only through sailib-digest-items.js. A digest with no index
entries is invisible to home search, and an index entry with a stale
hash links to a digest page that never opens. Run this before any push
that adds or changes a digest (see AGENTS.md).

Requires node (the digests page stores its data as JS literals).
Reads the working tree, not HEAD, so run it after your edits.
"""

import json
import os
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIGESTS_PAGE = os.path.join(REPO, "digests", "index.html")
INDEX_FILE = os.path.join(REPO, "assets", "sailib-digest-items.js")

EXTRACTOR = r"""
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
function extract(src, marker, open, close) {
  let i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found: ' + marker);
  let j = src.indexOf(open, i);
  let depth = 0, inS = null, esc = false;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (inS) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === inS) inS = null; }
    else {
      if (c === '"' || c === "'" || c === '`') inS = c;
      else if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) return src.slice(j, k + 1); }
    }
  }
  throw new Error('unbalanced literal for ' + marker);
}
const DIGESTS = eval('(' + extract(src, 'var DIGESTS =', '{', '}') + ')');
for (const key of ['primers', 'laughter', 'wordplay', 'readalongs', 'stories']) {
  try { DIGESTS[key] = eval('(' + extract(src, 'DIGESTS.' + key + ' =', '[', ']') + ')'); }
  catch (e) { DIGESTS[key] = []; }
}
const CANON = eval('(' + extract(src, 'var CANONICAL_HASH_BY_NAME =', '{', '}') + ')');
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
const KINDMAP = {readalong:'readalongs', story:'stories', primer:'primers', wordplay:'wordplay',
  laughter:'laughter', saint:'saints', leela:'leelas', baba:'baba', analogy:'clusters'};
const out = [];
for (const [kind, key] of Object.entries(KINDMAP)) {
  for (const d of (DIGESTS[key] || [])) {
    const hash = CANON[d.name] || slug(kind + '-' + d.name);
    let sections = [];
    if (d.points) sections = d.points.map(p => p.title === undefined ? null : p.title);
    else if (d.sections) sections = d.sections.map(s => s.title === undefined ? null : s.title);
    else if (d.items) sections = d.items.map(it => it.name === undefined ? null : it.name);
    else if (d.categories) sections = d.categories.map(c => c.title);
    else sections = [];
    out.push({kind, name: d.name, hash, sections});
  }
}
console.log(JSON.stringify(out));
"""


def load_page_digests():
    if not os.path.exists(DIGESTS_PAGE):
        print(f"ERROR: digests page not found: {DIGESTS_PAGE}", file=sys.stderr)
        sys.exit(2)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(EXTRACTOR)
        js_path = f.name
    try:
        proc = subprocess.run(["node", js_path, DIGESTS_PAGE],
                              capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        print("ERROR: node is required but not found on PATH.", file=sys.stderr)
        sys.exit(2)
    finally:
        os.unlink(js_path)
    if proc.returncode != 0:
        print(f"ERROR: failed to parse {DIGESTS_PAGE}:\n{proc.stderr.strip()}", file=sys.stderr)
        sys.exit(2)
    return json.loads(proc.stdout)


def load_index():
    with open(INDEX_FILE, encoding="utf-8") as f:
        text = f.read()
    return json.loads(text.split("=", 1)[1].strip().rstrip(";"))


def main(argv):
    strict_names = argv[1:]
    digests = load_page_digests()
    items = load_index()
    by_name = {}
    for it in items:
        by_name.setdefault(it.get("d"), []).append(it)
    page_names = set(d["name"] for d in digests)

    errors = []
    warnings = []
    checked = digests if not strict_names else [d for d in digests if d["name"] in strict_names]
    for name in strict_names:
        if name not in page_names:
            errors.append(f"STRICT: digest not found on page: {name!r}")

    for d in checked:
        idx = by_name.get(d["name"], [])
        if not idx:
            errors.append(f"MISSING: digest has no index items: {d['name']!r} (hash {d['hash']})")
            continue
        bad_h = sorted(set(i["h"] for i in idx if i["h"] != d["hash"]))
        if bad_h:
            errors.append(f"HASH: index hash mismatch for {d['name']!r}: "
                          f"index has {bad_h}, page computes {d['hash']}")
        have = [i.get("t") for i in idx]
        missing = [t for t in d["sections"] if t not in have]
        if missing:
            msg = (f"{d['kind']} {d['name']!r}: {len(missing)}/{len(d['sections'])} "
                   f"sections lack index entries")
            if strict_names:
                errors.append("STRICT " + msg + ": " +
                              "; ".join(str(t)[:80] for t in missing[:8]))
            else:
                warnings.append(msg)

    if not strict_names:
        for dn in sorted(by_name):
            if dn not in page_names:
                errors.append(f"ORPHAN: index items for digest not on page: {dn!r} "
                              f"({len(by_name[dn])} items)")

    print(f"digests on page: {len(digests)} | index items: {len(items)} | "
          f"digests indexed: {len([d for d in digests if by_name.get(d['name'])])}")
    for w in warnings:
        print(f"WARNING (partial coverage): {w}")
    for e in errors:
        print(f"ERROR: {e}")
    if errors:
        print(f"FAIL: {len(errors)} error(s)")
        return 1
    if warnings and not strict_names:
        print(f"OK with {len(warnings)} partial-coverage warning(s) "
              f"(older digests predate the per-section rule)")
    else:
        print("OK: all checked digests fully indexed")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
