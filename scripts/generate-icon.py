#!/usr/bin/env python3
"""Generate a premium PasteRack app icon (512x512 PNG) using raw pixel math."""
import struct, zlib, math, os

def create_png(w, h, pixels):
    """Create PNG from RGBA pixel array."""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    raw = b''
    for y in range(h):
        raw += b'\x00'
        for x in range(w):
            raw += bytes(pixels[y][x])

    idat = zlib.compress(raw, 9)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', idat)
    png += chunk(b'IEND', b'')
    return png

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], max(0, min(1, t)))) for i in range(4))

def rounded_rect_sdf(x, y, cx, cy, hw, hh, r):
    """Signed distance field for rounded rectangle."""
    dx = abs(x - cx) - hw + r
    dy = abs(y - cy) - hh + r
    outside = math.sqrt(max(dx, 0)**2 + max(dy, 0)**2) - r
    inside = min(max(dx, dy), 0)
    return outside + inside

def circle_sdf(x, y, cx, cy, r):
    return math.sqrt((x - cx)**2 + (y - cy)**2) - r

SIZE = 512
PAD = 40  # padding from edge
CORNER_R = 90  # rounded corner radius

# Colors
BG_TOP = (18, 18, 35, 255)       # Deep dark navy top
BG_BOT = (12, 12, 25, 255)       # Even darker bottom
ACCENT1 = (108, 92, 231, 255)    # #6c5ce7 purple
ACCENT2 = (162, 155, 254, 255)   # #a29bfe light purple
GLOW = (108, 92, 231, 60)        # Purple glow
WHITE = (240, 240, 245, 255)
WHITE_DIM = (240, 240, 245, 180)
TRANSPARENT = (0, 0, 0, 0)

pixels = [[TRANSPARENT for _ in range(SIZE)] for _ in range(SIZE)]

center = SIZE // 2
half_w = (SIZE - PAD * 2) // 2
half_h = (SIZE - PAD * 2) // 2

for y in range(SIZE):
    for x in range(SIZE):
        # -- Background rounded rectangle --
        d = rounded_rect_sdf(x, y, center, center, half_w, half_h, CORNER_R)

        if d < 1.5:
            # Gradient from top to bottom
            t = (y - PAD) / (SIZE - PAD * 2)
            bg = lerp_color(BG_TOP, BG_BOT, t)

            # Subtle radial glow behind clipboard
            glow_cx, glow_cy = center, center - 20
            glow_dist = math.sqrt((x - glow_cx)**2 + (y - glow_cy)**2)
            glow_r = 180
            if glow_dist < glow_r:
                glow_t = 1 - (glow_dist / glow_r)
                glow_t = glow_t ** 2  # ease
                glow_alpha = int(35 * glow_t)
                # Blend glow
                bg = (
                    min(255, bg[0] + int(ACCENT1[0] * glow_t * 0.15)),
                    min(255, bg[1] + int(ACCENT1[1] * glow_t * 0.15)),
                    min(255, bg[2] + int(ACCENT1[2] * glow_t * 0.2)),
                    bg[3]
                )

            # Anti-alias edge
            if d > -1.5:
                alpha = max(0, min(255, int(255 * (1.5 - d) / 3.0)))
                bg = (bg[0], bg[1], bg[2], alpha)

            pixels[y][x] = bg

# -- Draw clipboard board --
board_x, board_y = center, center + 15
board_hw, board_hh = 100, 130
board_r = 18

for y in range(SIZE):
    for x in range(SIZE):
        d = rounded_rect_sdf(x, y, board_x, board_y, board_hw, board_hh, board_r)
        if d < 1.5:
            # Gradient on clipboard
            t = (y - (board_y - board_hh)) / (board_hh * 2)
            c = lerp_color(ACCENT1, ACCENT2, t * 0.3)

            # Inner slight transparency for glass effect
            c = (c[0], c[1], c[2], 230)

            if d > -1.5:
                alpha = max(0, min(230, int(230 * (1.5 - d) / 3.0)))
                c = (c[0], c[1], c[2], alpha)

            # Blend over existing
            bg = pixels[y][x]
            a = c[3] / 255.0
            blended = (
                int(c[0] * a + bg[0] * (1 - a)),
                int(c[1] * a + bg[1] * (1 - a)),
                int(c[2] * a + bg[2] * (1 - a)),
                max(bg[3], c[3])
            )
            pixels[y][x] = blended

# -- Clipboard clip (top tab) --
clip_x, clip_y = center, board_y - board_hh - 5
clip_hw, clip_hh = 40, 16
clip_r = 8

for y in range(SIZE):
    for x in range(SIZE):
        d = rounded_rect_sdf(x, y, clip_x, clip_y, clip_hw, clip_hh, clip_r)
        if d < 1.5:
            c = ACCENT2
            if d > -1.5:
                alpha = max(0, min(255, int(255 * (1.5 - d) / 3.0)))
                c = (c[0], c[1], c[2], alpha)
            else:
                c = (c[0], c[1], c[2], 255)

            bg = pixels[y][x]
            a = c[3] / 255.0
            blended = (
                int(c[0] * a + bg[0] * (1 - a)),
                int(c[1] * a + bg[1] * (1 - a)),
                int(c[2] * a + bg[2] * (1 - a)),
                max(bg[3], c[3])
            )
            pixels[y][x] = blended

# -- Text lines on clipboard (representing paste content) --
lines = [
    (center, board_y - 60, 70, 4),
    (center - 10, board_y - 38, 60, 4),
    (center, board_y - 16, 70, 4),
    (center - 15, board_y + 6, 55, 4),
    (center + 5, board_y + 28, 65, 4),
    (center - 5, board_y + 50, 60, 4),
]

for lx, ly, lhw, lhh in lines:
    for y in range(SIZE):
        for x in range(SIZE):
            d = rounded_rect_sdf(x, y, lx, ly, lhw, lhh, 3)
            if d < 1.0:
                c = list(WHITE_DIM)
                if d > -1.0:
                    alpha = max(0, min(c[3], int(c[3] * (1.0 - d) / 2.0)))
                    c[3] = alpha
                c = tuple(c)

                bg = pixels[y][x]
                a = c[3] / 255.0
                blended = (
                    int(c[0] * a + bg[0] * (1 - a)),
                    int(c[1] * a + bg[1] * (1 - a)),
                    int(c[2] * a + bg[2] * (1 - a)),
                    max(bg[3], c[3])
                )
                pixels[y][x] = blended

# -- Small "P" badge in bottom-right --
badge_cx, badge_cy = center + 80, board_y + board_hh - 10
badge_r = 28

for y in range(SIZE):
    for x in range(SIZE):
        d = circle_sdf(x, y, badge_cx, badge_cy, badge_r)
        if d < 1.5:
            c = WHITE
            if d > -1.5:
                alpha = max(0, min(255, int(255 * (1.5 - d) / 3.0)))
                c = (c[0], c[1], c[2], alpha)

            bg = pixels[y][x]
            a = c[3] / 255.0
            blended = (
                int(c[0] * a + bg[0] * (1 - a)),
                int(c[1] * a + bg[1] * (1 - a)),
                int(c[2] * a + bg[2] * (1 - a)),
                max(bg[3], c[3])
            )
            pixels[y][x] = blended

# Inner "P" in the badge (using SDF shapes for the letter)
p_left = badge_cx - 11
p_top = badge_cy - 14
p_color = (40, 30, 100, 255)  # Dark purple

# P vertical bar
for y in range(SIZE):
    for x in range(SIZE):
        d = rounded_rect_sdf(x, y, p_left + 3, badge_cy, 4, 13, 2)
        if d < 1.0:
            c = list(p_color)
            if d > -1.0:
                c[3] = max(0, min(255, int(255 * (1.0 - d) / 2.0)))
            c = tuple(c)
            bg = pixels[y][x]
            a = c[3] / 255.0
            pixels[y][x] = (
                int(c[0] * a + bg[0] * (1 - a)),
                int(c[1] * a + bg[1] * (1 - a)),
                int(c[2] * a + bg[2] * (1 - a)),
                max(bg[3], c[3])
            )

# P bump (top horizontal + right side + middle horizontal)
for part in [
    (p_left + 10, p_top + 4, 10, 4, 2),     # top bar
    (p_left + 10, badge_cy - 3, 10, 4, 2),   # middle bar
    (p_left + 17, p_top + 10, 4, 8, 2),      # right bar
]:
    px, py, phw, phh, pr = part
    for y in range(SIZE):
        for x in range(SIZE):
            d = rounded_rect_sdf(x, y, px, py, phw, phh, pr)
            if d < 1.0:
                c = list(p_color)
                if d > -1.0:
                    c[3] = max(0, min(255, int(255 * (1.0 - d) / 2.0)))
                c = tuple(c)
                bg = pixels[y][x]
                a = c[3] / 255.0
                pixels[y][x] = (
                    int(c[0] * a + bg[0] * (1 - a)),
                    int(c[1] * a + bg[1] * (1 - a)),
                    int(c[2] * a + bg[2] * (1 - a)),
                    max(bg[3], c[3])
                )

# -- Subtle top highlight (glass reflection) --
for y in range(PAD, PAD + 60):
    for x in range(SIZE):
        d = rounded_rect_sdf(x, y, center, center, half_w, half_h, CORNER_R)
        if d < 0:
            t = (y - PAD) / 60.0
            alpha = int(12 * (1 - t))
            bg = pixels[y][x]
            if bg[3] > 0:
                pixels[y][x] = (
                    min(255, bg[0] + alpha),
                    min(255, bg[1] + alpha),
                    min(255, bg[2] + alpha),
                    bg[3]
                )

# Save
os.makedirs('build', exist_ok=True)
os.makedirs('assets', exist_ok=True)

png512 = create_png(SIZE, SIZE, pixels)

with open('build/icon.png', 'wb') as f:
    f.write(png512)

# Downscale to 256x256 for additional size
pixels_256 = []
for y in range(0, SIZE, 2):
    row = []
    for x in range(0, SIZE, 2):
        # Average 2x2 block
        p00 = pixels[y][x]
        p10 = pixels[min(y+1, SIZE-1)][x]
        p01 = pixels[y][min(x+1, SIZE-1)]
        p11 = pixels[min(y+1, SIZE-1)][min(x+1, SIZE-1)]
        avg = tuple(int((p00[i] + p10[i] + p01[i] + p11[i]) / 4) for i in range(4))
        row.append(avg)
    pixels_256.append(row)

png256 = create_png(256, 256, pixels_256)
with open('build/icon-256.png', 'wb') as f:
    f.write(png256)

print(f"Icons generated: build/icon.png (512x512), build/icon-256.png (256x256)")
