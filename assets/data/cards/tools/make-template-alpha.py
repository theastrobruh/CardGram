from PIL import Image, ImageDraw
from pathlib import Path

root = Path('assets/data/cards/database/templates')
size = (896, 1200)

def mask_for(name):
    scale = 4
    mask = Image.new('L', (size[0]*scale, size[1]*scale), 255)
    d = ImageDraw.Draw(mask)
    if name == 'E1':
        box = (55*scale, 145*scale, 840*scale, 1030*scale)
        d.rounded_rectangle(box, radius=42*scale, fill=0)
    else:
        pts = [(150,158),(742,158),(810,222),(810,700),(744,770),(150,770),(88,704),(88,224)]
        d.polygon([(x*scale,y*scale) for x,y in pts], fill=0)
    return mask.resize(size, Image.LANCZOS)

for name in ('E1','E2','E3'):
    src = root / f'{name}.webp'
    im = Image.open(src).convert('RGBA')
    im.putalpha(mask_for(name))
    im.save(src, 'WEBP', quality=90, method=6)
    for sub, maxedge, quality in (('thumbs',300,82),('micro',200,80)):
        out = root / sub / f'{name}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        thumb = im.copy()
        thumb.thumbnail((maxedge,maxedge), Image.LANCZOS)
        thumb.save(out, 'WEBP', quality=quality, method=6)
    print(name, src.stat().st_size)