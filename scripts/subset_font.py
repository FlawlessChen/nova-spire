#!/usr/bin/env python3
"""Subset assets/fonts/zpix.full.ttf into assets/fonts/zpix.ttf, keeping only
the glyphs the game actually renders.

The full Zpix CJK pixel font is ~7 MB. The game only uses a few hundred unique
characters (i18n strings + render-file literals), so subsetting cuts the bundle
to ~130 KB — a 98% reduction.

Re-run this whenever new content (cards, enemies, events, UI strings) is added
that introduces characters not already covered, otherwise those characters will
render as tofu. The script scans every .ts file under src/ and unions every
character it finds, so any string literal in the codebase is covered
automatically.

Requires fonttools:  pip install fonttools
Run from the project root:  python3 scripts/subset_font.py
"""
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_FONT = os.path.join(ROOT, "assets", "fonts", "zpix.full.ttf")  # full font (source of truth, gitignored)
OUT_FONT = os.path.join(ROOT, "assets", "fonts", "zpix.ttf")       # subsetted font (used by the app, committed)
SRC = os.path.join(ROOT, "src")
FULL_FONT_URL = "https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@master/dist/zpix.ttf"

# Characters to always include (cheap, and avoids surprises): full ASCII
# printable plus common CJK / full-width punctuation.
BASE = set(chr(c) for c in range(0x20, 0x7F))
BASE.update("，。、：；！？「」『』（）【】《》〈〉…—·・•°★☆◆◇")


def collect_chars() -> set[str]:
    chars = set(BASE)
    for dirpath, _, files in os.walk(SRC):
        for name in files:
            if name.endswith(".ts") or name.endswith(".tsx"):
                with open(os.path.join(dirpath, name), encoding="utf-8") as fh:
                    chars.update(fh.read())
    return chars


def main() -> int:
    if not os.path.isfile(SRC_FONT):
        print(f"full font not found at {SRC_FONT}; downloading from {FULL_FONT_URL} …", file=sys.stderr)
        os.makedirs(os.path.dirname(SRC_FONT), exist_ok=True)
        try:
            urllib.request.urlretrieve(FULL_FONT_URL, SRC_FONT)
        except Exception as e:
            print(f"error: failed to download full font: {e}", file=sys.stderr)
            return 1
    try:
        import fontTools  # noqa: F401
    except ImportError:
        print("error: fonttools not installed. run: pip install fonttools", file=sys.stderr)
        return 1

    chars = collect_chars()
    cjk = [c for c in chars if "\u4e00" <= c <= "\u9fff"]
    before = os.path.getsize(SRC_FONT)

    # Filter out characters the source font doesn't actually contain, so
    # pyftsubset doesn't abort on MissingGlyphsSubsettingError. Report any
    # dropped chars so surprises (e.g. a needed glyph missing from the font)
    # are visible.
    from fontTools.ttLib import TTFont
    src_cmap = TTFont(SRC_FONT).getBestCmap()
    dropped = sorted(c for c in chars if ord(c) not in src_cmap and c not in ("\n", "\r", "\t"))
    if dropped:
        print(f"note: {len(dropped)} chars not in source font, skipping: {''.join(dropped[:40])}", file=sys.stderr)
    subset_chars = "".join(sorted(c for c in chars if ord(c) in src_cmap))

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
        tf.write(subset_chars)
        chars_file = tf.name
    with tempfile.NamedTemporaryFile(suffix=".ttf", delete=False) as tf:
        out_file = tf.name

    try:
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset",
                SRC_FONT,
                f"--text-file={chars_file}",
                f"--output-file={out_file}",
                "--desubroutinize",
            ],
            check=True,
        )
        # Verify coverage of the chars we asked for.
        cmap = TTFont(out_file).getBestCmap()
        missing = [c for c in subset_chars if ord(c) not in cmap]
        if missing:
            print(f"warning: {len(missing)} chars dropped during subsetting: {''.join(missing[:30])}", file=sys.stderr)

        shutil.copyfile(out_file, OUT_FONT)
        after = os.path.getsize(OUT_FONT)
        print(f"unique chars: {len(chars)} ({len(cjk)} CJK)")
        print(f"font: {before / 1024:.0f} KB -> {after / 1024:.0f} KB  ({(1 - after / before) * 100:.1f}% smaller)")
        return 0
    finally:
        for p in (chars_file, out_file):
            try:
                os.unlink(p)
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
