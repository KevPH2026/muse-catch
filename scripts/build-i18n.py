#!/usr/bin/env python3
"""Re-inline the i18n/*.json locale dictionaries into app.html and index.html.

The project serves its HTML via open().read() with no build step, so locale
data is embedded as a single window.__MUSE_I18N__ assignment rather than
fetched at runtime. Run this after editing any i18n/*.json file:

    python3 scripts/build-i18n.py

It rewrites the <script> ... window.__MUSE_I18N__ = {...}; ... </script>
block in each target HTML file in place, leaving everything else untouched.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["zh-CN", "en", "zh-TW", "ja"]
TARGETS = ["app.html", "index.html"]

# Matches the inline locale-data block (the header comment line plus the
# window.__MUSE_I18N__ = {...}; assignment through its closing </script>).
# The leading comment line is either the real "Auto-generated" marker or the
# initial "PLACEHOLDER", so either form is rewritten in place.
BLOCK_RE = re.compile(
    r"<script>\s*\n// (?:Auto-generated inline locale data.*?|PLACEHOLDER — .*?)\n"
    r"window\.__MUSE_I18N__ = \{.*?\};\s*\n</script>",
    re.DOTALL,
)


def load_dicts():
    out = {}
    for code in LANGS:
        with open(ROOT / "i18n" / f"{code}.json", encoding="utf-8") as f:
            out[code] = json.load(f)
    # sanity check: identical key sets
    ref = set(out[LANGS[0]].keys())
    for code in LANGS[1:]:
        if set(out[code].keys()) != ref:
            sys.exit(f"[build-i18n] key mismatch in {code}: run the validator")
    return out


def render_block(dicts):
    payload = json.dumps(dicts, ensure_ascii=False, separators=(",", ":"))
    return (
        "<script>\n"
        "// Auto-generated inline locale data (do not edit here; edit i18n/*.json "
        "and regenerate with scripts/build-i18n.py).\n"
        f"window.__MUSE_I18N__ = {payload};\n"
        "</script>"
    )


def rewrite(path):
    text = path.read_text(encoding="utf-8")
    new_block = render_block(load_dicts())
    if not BLOCK_RE.search(text):
        print(f"[build-i18n] no inline block found in {path.name} — skipping")
        return False
    rewritten = BLOCK_RE.sub(lambda m: new_block, text)
    if rewritten == text:
        print(f"[build-i18n] {path.name} already up to date")
        return False
    path.write_text(rewritten, encoding="utf-8")
    print(f"[build-i18n] updated {path.name}")
    return True


def main():
    changed = False
    for name in TARGETS:
        p = ROOT / name
        if p.exists():
            changed = rewrite(p) or changed
    if not changed:
        print("[build-i18n] nothing to do")
    return 0


if __name__ == "__main__":
    sys.exit(main())
