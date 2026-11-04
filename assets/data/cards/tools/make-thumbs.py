#!/usr/bin/env python3
"""Genera las miniaturas WebP que usa el lobby de DeckGram.

El estudio 3D siempre carga los PNG originales; el hub, la biblioteca y las
colecciones usan estas miniaturas (máx. 760 px) para no descargar varios MB
por cada tarjeta visible.

Uso:
    python assets/data/cards/tools/make-thumbs.py
    python assets/data/cards/tools/make-thumbs.py --quality 84 --size 760

Requiere Pillow:  pip install pillow
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

SOURCE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.avif'}
SKIP_DIRS = {'thumbs', 'PSD', 'tools'}


def iter_sources(root: Path):
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path.suffix.lower() not in SOURCE_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        yield path


def make_thumb(source: Path, size: int, quality: int) -> Path:
    destination = source.parent / 'thumbs' / f'{source.stem}.webp'
    destination.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(source)
    image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    image.thumbnail((size, size), Image.LANCZOS)
    image.save(destination, 'WEBP', quality=quality, method=6)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description='Genera miniaturas WebP por colección.')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--size', type=int, default=760)
    parser.add_argument('--quality', type=int, default=84)
    args = parser.parse_args()

    root = args.root.resolve()
    count = 0
    for source in iter_sources(root):
        destination = make_thumb(source, args.size, args.quality)
        size_kb = destination.stat().st_size / 1024
        print(f'{destination.relative_to(root)}  {size_kb:.0f} KB')
        count += 1

    print(f'\n{count} miniaturas generadas en {root}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
