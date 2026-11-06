#!/usr/bin/env python3
"""Optimiza las cartas de los sets activos de CardGram.

- Convierte cada anverso/reverso a WebP 896 x 1200 (calidad 82).
- Genera las miniaturas de 760 px que usa el lobby.
- Crea el reverso compartido de la colección.
- Elimina los sets retirados (OG y FAN ART).

Uso:
    python assets/data/cards/tools/optimize-sets.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'database'
SETS = ['Champion-Verse', 'Dungeons and History', 'Mew Tarot', 'YGO']
OBSOLETE = ['OG', 'FAN ART']
FULL_SIZE = (896, 1200)
THUMB_SIZE = 760
MICRO_SIZE = 200
FULL_QUALITY = 82
THUMB_QUALITY = 80
MICRO_QUALITY = 76

FONT_BOLD = Path(r'C:\Windows\Fonts\segoeuib.ttf')
FONT_LIGHT = Path(r'C:\Windows\Fonts\segoeuil.ttf')


def load_font(path: Path, size: int):
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


def spaced(draw: ImageDraw.ImageDraw, xy, text: str, font, fill, spacing: int):
    """Dibuja texto con tracking manual."""
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + spacing


def make_shared_back() -> None:
    width, height = FULL_SIZE
    image = Image.new('RGB', (width, height), '#061824')
    pixels = image.load()
    top = (5, 18, 30)
    bottom = (10, 54, 68)
    for y in range(height):
        mix = y / (height - 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * mix) for i in range(3))
        for x in range(width):
            pixels[x, y] = color

    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for radius in range(430, 0, -6):
        alpha = int(1.9 * (1 - radius / 430) ** 1.4)
        if alpha <= 0:
            continue
        gdraw.ellipse(
            (width / 2 - radius, height * 0.42 - radius, width / 2 + radius, height * 0.42 + radius),
            fill=(72, 214, 209, alpha),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(26))
    image = Image.alpha_composite(image.convert('RGBA'), glow)

    draw = ImageDraw.Draw(image)
    random.seed(7)
    for _ in range(180):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.choice([1, 1, 1, 2, 2, 3])
        alpha = random.randint(28, 110)
        draw.ellipse((x, y, x + size, y + size), fill=(206, 250, 246, alpha))

    # Marco doble con esquinas suaves.
    draw.rounded_rectangle((34, 34, width - 34, height - 34), radius=46, outline=(124, 235, 221, 120), width=3)
    draw.rounded_rectangle((52, 52, width - 52, height - 52), radius=34, outline=(255, 255, 255, 44), width=1)

    center_x = width / 2
    center_y = height * 0.42
    # Rombo central.
    draw.polygon(
        [
            (center_x, center_y - 118),
            (center_x + 96, center_y),
            (center_x, center_y + 118),
            (center_x - 96, center_y),
        ],
        outline=(124, 235, 221, 190),
        width=3,
    )
    draw.polygon(
        [
            (center_x, center_y - 92),
            (center_x + 74, center_y),
            (center_x, center_y + 92),
            (center_x - 74, center_y),
        ],
        outline=(255, 255, 255, 60),
        width=1,
    )
    # Estrella de cuatro puntas.
    draw.polygon(
        [
            (center_x, center_y - 58),
            (center_x + 14, center_y - 12),
            (center_x + 60, center_y),
            (center_x + 14, center_y + 12),
            (center_x, center_y + 58),
            (center_x - 14, center_y + 12),
            (center_x - 60, center_y),
            (center_x - 14, center_y - 12),
        ],
        fill=(220, 255, 250, 225),
    )

    title_font = load_font(FONT_BOLD, 46)
    sub_font = load_font(FONT_LIGHT, 19)
    foot_font = load_font(FONT_BOLD, 15)

    title = 'CARDGRAM'
    tracking = 14
    title_width = sum(draw.textlength(char, font=title_font) for char in title) + tracking * (len(title) - 1)
    spaced(draw, ((width - title_width) / 2, height * 0.64), title, title_font, (238, 255, 252, 235), tracking)

    sub = 'CARD COLLECTION'
    sub_width = sum(draw.textlength(char, font=sub_font) for char in sub) + 8 * (len(sub) - 1)
    spaced(draw, ((width - sub_width) / 2, height * 0.64 + 66), sub, sub_font, (124, 235, 221, 190), 8)

    foot = 'AQUA GLASS STUDIO'
    foot_width = sum(draw.textlength(char, font=foot_font) for char in foot) + 5 * (len(foot) - 1)
    spaced(draw, ((width - foot_width) / 2, height - 126), foot, foot_font, (255, 255, 255, 95), 5)

    target = DB / '_shared' / 'BACK_CARDGRAM.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    image.convert('RGB').save(target, 'WEBP', quality=FULL_QUALITY, method=6)
    print(f'_shared/BACK_CARDGRAM.webp  {target.stat().st_size / 1024:.0f} KB')


def optimize_set(folder: Path) -> int:
    count = 0
    thumbs = folder / 'thumbs'
    for source in sorted(folder.iterdir()):
        if not source.is_file() or source.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
        image = Image.open(source).convert('RGB')
        if image.size != FULL_SIZE:
            image = image.resize(FULL_SIZE, Image.LANCZOS)
        destination = source.with_suffix('.webp')

        already_optimized = (
            source.suffix.lower() == '.webp'
            and image.size == FULL_SIZE
            and source.stat().st_size < 400_000
        )
        if not already_optimized:
            image.save(destination, 'WEBP', quality=FULL_QUALITY, method=6)
            if source != destination:
                source.unlink()
            print(f'{folder.name}/{destination.name}  {destination.stat().st_size / 1024:.0f} KB')

        thumbs.mkdir(parents=True, exist_ok=True)
        thumb_path = thumbs / f'{source.stem}.webp'
        if not thumb_path.exists() or thumb_path.stat().st_mtime < destination.stat().st_mtime:
            thumb = image.copy()
            thumb.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
            thumb.save(thumb_path, 'WEBP', quality=THUMB_QUALITY, method=6)

        micro = folder / 'micro'
        micro.mkdir(parents=True, exist_ok=True)
        micro_path = micro / f'{source.stem}.webp'
        if not micro_path.exists() or micro_path.stat().st_mtime < destination.stat().st_mtime:
            thumb = image.copy()
            thumb.thumbnail((MICRO_SIZE, MICRO_SIZE), Image.LANCZOS)
            thumb.save(micro_path, 'WEBP', quality=MICRO_QUALITY, method=6)
        count += 1

    # Miniaturas huérfanas de imágenes que ya no están en el set.
    sources = {path.stem for path in folder.iterdir() if path.is_file()}
    for thumb in thumbs.glob('*.webp'):
        if thumb.stem not in sources:
            thumb.unlink()
            print(f'{folder.name}/thumbs/{thumb.name}  eliminada (huérfana)')
    for thumb in (folder / 'micro').glob('*.webp'):
        if thumb.stem not in sources:
            thumb.unlink()
            print(f'{folder.name}/micro/{thumb.name}  eliminada (huérfana)')

    return count


def make_shared_thumb() -> None:
    source = DB / '_shared' / 'BACK_CARDGRAM.webp'
    thumb = Image.open(source).convert('RGB')
    thumb.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
    destination = DB / '_shared' / 'thumbs' / 'BACK_CARDGRAM.webp'
    destination.parent.mkdir(parents=True, exist_ok=True)
    thumb.save(destination, 'WEBP', quality=THUMB_QUALITY, method=6)

    micro = Image.open(source).convert('RGB')
    micro.thumbnail((MICRO_SIZE, MICRO_SIZE), Image.LANCZOS)
    micro_destination = DB / '_shared' / 'micro' / 'BACK_CARDGRAM.webp'
    micro_destination.parent.mkdir(parents=True, exist_ok=True)
    micro.save(micro_destination, 'WEBP', quality=MICRO_QUALITY, method=6)


def main() -> int:
    for name in OBSOLETE:
        target = DB / name
        if target.exists():
            import shutil

            shutil.rmtree(target)
            print(f'eliminado {name}')

    total = 0
    for name in SETS:
        folder = DB / name
        if not folder.exists():
            print(f'falta {name}')
            continue
        total += optimize_set(folder)

    make_shared_back()
    make_shared_thumb()
    print(f'\n{total} imágenes optimizadas')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
