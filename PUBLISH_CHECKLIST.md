# Pre-publish checklist (pathofsai.com)

His rule: **validate the live site (not just the repo) before any publish, redirect, or deprecation.**

Run these before every push that changes what visitors see:

1. **Staged build is versioned** — commit the current `upload_pages/` state (`git add -A && git commit -m "..."`), so any page can be reverted.
2. **Links are relative** — no `muse.ai` URLs anywhere in the staged build (`rg -i "muse\.ai" .` must return nothing except this checklist).
3. **Nav targets are correct** — Home goes to `/`, page buttons go to their own `/path/`, breadcrumbs don't loop (e.g. Music's Home must not point at `/music/`).
4. **Push, wait for GitHub Pages deploy**, then check the LIVE pages in a fresh/incognito session: correct title/heading on each URL, images load, search works.
5. **If Cloudflare caches stale content** — he purges it himself (dashboard → pathofsai.com → Caching → Purge Everything). Verify after purge.
6. **Only then** publish redirects or deprecate old URLs.

If anything looks wrong on the live site: revert in git, rebuild, repeat from step 2.
