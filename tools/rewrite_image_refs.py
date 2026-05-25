"""Rewrite image references in source files (*.html, *.css, *.js, *.py, *.md)
from .jpg / .jpeg / .png (any case) → .webp.

Repo-wide grep confirmed every such reference is local; no remote URL in
this codebase ends in those extensions, so a blanket suffix swap is safe.

Run from the repo root:

    python tools/rewrite_image_refs.py
"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
TARGET_EXTS = {'.html', '.css', '.js', '.md', '.py'}
SKIP_DIRS = {'.git', '.claude', '.playwright-mcp', '.vscode'}

# Match .jpg / .jpeg / .png in any case. \b ensures we don't catch things like ".jpgz".
EXT_RE = re.compile(r'\.(jpe?g|png)\b', re.IGNORECASE)

def rewrite(text: str) -> tuple[str, int]:
    n = [0]
    def sub(m):
        n[0] += 1
        return '.webp'
    return EXT_RE.sub(sub, text), n[0]

def main():
    files = []
    for p in ROOT.rglob('*'):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts):
            continue
        if p.suffix.lower() not in TARGET_EXTS:
            continue
        files.append(p)

    edited = 0
    total = 0
    for f in files:
        try:
            text = f.read_text(encoding='utf-8')
        except Exception as e:
            print(f'  ! skipping {f.relative_to(ROOT)}: {e}')
            continue
        new, n = rewrite(text)
        if n:
            f.write_text(new, encoding='utf-8', newline='\n')
            print(f'  {f.relative_to(ROOT)}: {n} refs rewritten')
            total += n
            edited += 1

    print()
    print(f'Edited {edited} files, rewrote {total} image references.')

if __name__ == '__main__':
    main()
