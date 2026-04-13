#!/usr/bin/env python3
"""Generate 81x81 tab bar icons for 桔光小语 WeChat Mini Program."""

from PIL import Image, ImageDraw
import math
import os

SIZE = 81
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'images', 'tabbar')

COLOR_NORMAL = (155, 133, 116)      # #9B8574
COLOR_ACTIVE = (255, 140, 66)       # #FF8C42
TRANSPARENT = (0, 0, 0, 0)


def new_canvas():
    return Image.new('RGBA', (SIZE, SIZE), TRANSPARENT)


def draw_home(color):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx = SIZE // 2

    # Roof triangle
    roof = [(cx, 14), (14, 38), (67, 38)]
    d.polygon(roof, outline=color, width=3)

    # House body
    d.rounded_rectangle([22, 38, 59, 65], radius=3, outline=color, width=3)

    # Door
    d.rounded_rectangle([33, 48, 48, 65], radius=2, outline=color, width=2)

    return img


def draw_math(color):
    """Lightbulb icon for math thinking."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx = SIZE // 2

    # Bulb circle
    d.ellipse([24, 10, 57, 43], outline=color, width=3)

    # Filament rays inside bulb
    d.line([(cx, 20), (cx, 34)], fill=color, width=2)
    d.line([(cx - 6, 27), (cx + 6, 27)], fill=color, width=2)

    # Bulb base
    d.line([(30, 43), (30, 52)], fill=color, width=3)
    d.line([(51, 43), (51, 52)], fill=color, width=3)

    # Base rings
    d.line([(30, 48), (51, 48)], fill=color, width=2)
    d.line([(30, 52), (51, 52)], fill=color, width=2)

    # Bottom tip
    d.line([(34, 56), (47, 56)], fill=color, width=2)
    d.ellipse([37, 56, 44, 62], fill=color)

    return img


def draw_writing(color):
    """Pencil icon for writing guidance."""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    # Pencil body (rotated ~45deg)
    # We'll draw a simple pencil shape
    pts_body = [(20, 58), (16, 62), (52, 26), (56, 22), (60, 26), (24, 62)]

    # Pencil outline
    d.line([(52, 18), (22, 48)], fill=color, width=3)  # left edge
    d.line([(60, 26), (30, 56)], fill=color, width=3)  # right edge
    d.line([(52, 18), (60, 26)], fill=color, width=3)  # top
    d.line([(22, 48), (16, 64)], fill=color, width=3)  # tip left
    d.line([(30, 56), (16, 64)], fill=color, width=3)  # tip right

    # Eraser section
    d.line([(46, 24), (54, 32)], fill=color, width=2)

    # Small writing lines on bottom right
    d.line([(38, 68), (64, 68)], fill=color, width=2)
    d.line([(44, 62), (64, 62)], fill=color, width=2)

    return img


def draw_mine(color):
    """Person icon for profile."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx = SIZE // 2

    # Head circle
    d.ellipse([cx - 11, 12, cx + 11, 34], outline=color, width=3)

    # Body arc
    d.arc([cx - 24, 34, cx + 24, 70], start=0, end=180, fill=color, width=3)

    # Shoulders connection
    d.line([(cx - 24, 52), (cx + 24, 52)], fill=color, width=3)

    return img


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, 'PNG')
    print(f'  ✓ {name} ({os.path.getsize(path)} bytes)')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print('Generating tab bar icons (81×81px)...\n')

    icons = {
        'home': draw_home,
        'math': draw_math,
        'writing': draw_writing,
        'mine': draw_mine,
    }

    for name, draw_fn in icons.items():
        normal = draw_fn(COLOR_NORMAL)
        active = draw_fn(COLOR_ACTIVE)
        save(normal, f'{name}.png')
        save(active, f'{name}-active.png')

    print(f'\nDone! 8 icons saved to {os.path.abspath(OUT_DIR)}')


if __name__ == '__main__':
    main()
