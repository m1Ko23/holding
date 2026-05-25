"""Convert every image in assets/ to .webp and delete the original.

JPG/JPEG → lossy WebP at quality 90.
PNG → lossless WebP (preserves transparency).
SVG and existing .webp files are skipped.

Then rewrites all references in *.html, *.css and the project generator's
META so the new .webp paths are wired up.

Run from the repo root:

    python tools/convert_to_webp.py
"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
QUALITY = 90  # for JPG → lossy WebP
JPG_EXTS  = {'.jpg', '.jpeg'}
PNG_EXTS  = {'.png'}
SKIP_EXTS = {'.svg', '.webp', '.ico'}

def convert_one(src: Path) -> tuple[Path | None, str]:
    """Returns (new_path, status) where status is 'ok' | 'exists' | 'skip' | 'err: ...'"""
    ext = src.suffix.lower()
    if ext in SKIP_EXTS:
        return None, 'skip'
    dst = src.with_suffix('.webp')
    if dst.exists() and dst != src:
        # Already converted on a previous run — delete the leftover original
        try:
            src.unlink()
            return dst, 'orig-removed'
        except OSError as e:
            return None, f'err: {e}'
    try:
        im = Image.open(src)
        if ext in PNG_EXTS:
            # Preserve transparency, use lossless WebP
            im = im.convert('RGBA') if im.mode in ('LA', 'P') and 'transparency' in im.info else im
            im.save(dst, 'WEBP', lossless=True, quality=100, method=6)
        else:
            # JPG/JPEG → lossy WebP
            if im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGB')
            im.save(dst, 'WEBP', quality=QUALITY, method=6)
        im.close()
    except Exception as e:
        return None, f'err: {e}'
    # Remove the original
    try:
        if src != dst:
            src.unlink()
    except OSError as e:
        return dst, f'err removing src: {e}'
    return dst, 'ok'

def main():
    targets = []
    for p in ASSETS.rglob('*'):
        if not p.is_file():
            continue
        if p.suffix.lower() in JPG_EXTS | PNG_EXTS:
            targets.append(p)

    print(f'Found {len(targets)} images to convert under assets/')
    stats = {'ok': 0, 'orig-removed': 0, 'skip': 0, 'err': 0}
    saved_bytes = 0
    for src in targets:
        before = src.stat().st_size
        dst, status = convert_one(src)
        if status.startswith('err'):
            print(f'  ! {src.relative_to(ROOT)} — {status}')
            stats['err'] += 1
            continue
        if status == 'skip':
            stats['skip'] += 1
            continue
        if dst:
            after = dst.stat().st_size
            saved_bytes += max(0, before - after)
            label = '✓' if status == 'ok' else '⟲'
            print(f'  {label} {src.relative_to(ROOT)} → {dst.name}  ({before//1024} → {after//1024} KB)')
        stats[status] = stats.get(status, 0) + 1

    print()
    print(f'Converted: {stats["ok"]}, leftovers removed: {stats["orig-removed"]}, '
          f'skipped: {stats["skip"]}, errors: {stats["err"]}')
    print(f'Approx. saved: {saved_bytes // (1024*1024)} MB')

if __name__ == '__main__':
    main()
