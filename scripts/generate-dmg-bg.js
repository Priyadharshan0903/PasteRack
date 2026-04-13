#!/usr/bin/env python3
// ^ ignore above — this is actually Node, the shebang is just decoration
// Generates a DMG background image (540x380) with install instructions

const { createCanvas } = (() => {
  // We'll generate a raw PNG without canvas dependencies
  return { createCanvas: null };
})();

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const WIDTH = 540;
const HEIGHT = 380;

function createPNG(w, h, pixels) {
  function chunk(type, data) {
    const buf = Buffer.concat([type, data]);
    const crc = crc32(buf);
    return Buffer.concat([
      uint32(data.length),
      buf,
      uint32(crc),
    ]);
  }

  function uint32(val) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(val >>> 0, 0);
    return b;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // IDAT
  const raw = Buffer.alloc(h * (1 + w * 3));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    raw[offset++] = 0; // filter none
    for (let x = 0; x < w; x++) {
      const px = pixels[y][x];
      raw[offset++] = px[0];
      raw[offset++] = px[1];
      raw[offset++] = px[2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk(Buffer.from("IHDR"), ihdr),
    chunk(Buffer.from("IDAT"), compressed),
    chunk(Buffer.from("IEND"), Buffer.alloc(0)),
  ]);
}

// Simple 5x7 bitmap font for text rendering
const FONT = {
  ' ': [0,0,0,0,0,0,0],
  'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  'D': [0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
  'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
  'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'I': [0b01110,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
  'K': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  'M': [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
  'N': [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  'S': [0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110],
  'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'V': [0b10001,0b10001,0b10001,0b10001,0b01010,0b01010,0b00100],
  'W': [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  'X': [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  'Y': [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  'a': [0b00000,0b00000,0b01110,0b00001,0b01111,0b10001,0b01111],
  'b': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b11110],
  'c': [0b00000,0b00000,0b01110,0b10000,0b10000,0b10001,0b01110],
  'd': [0b00001,0b00001,0b01101,0b10011,0b10001,0b10001,0b01111],
  'e': [0b00000,0b00000,0b01110,0b10001,0b11111,0b10000,0b01110],
  'f': [0b00110,0b01001,0b01000,0b11100,0b01000,0b01000,0b01000],
  'g': [0b00000,0b01111,0b10001,0b10001,0b01111,0b00001,0b01110],
  'h': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b10001],
  'i': [0b00100,0b00000,0b01100,0b00100,0b00100,0b00100,0b01110],
  'k': [0b10000,0b10000,0b10010,0b10100,0b11000,0b10100,0b10010],
  'l': [0b01100,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
  'm': [0b00000,0b00000,0b11010,0b10101,0b10101,0b10001,0b10001],
  'n': [0b00000,0b00000,0b10110,0b11001,0b10001,0b10001,0b10001],
  'o': [0b00000,0b00000,0b01110,0b10001,0b10001,0b10001,0b01110],
  'p': [0b00000,0b00000,0b11110,0b10001,0b11110,0b10000,0b10000],
  'r': [0b00000,0b00000,0b10110,0b11001,0b10000,0b10000,0b10000],
  's': [0b00000,0b00000,0b01110,0b10000,0b01110,0b00001,0b11110],
  't': [0b01000,0b01000,0b11100,0b01000,0b01000,0b01001,0b00110],
  'u': [0b00000,0b00000,0b10001,0b10001,0b10001,0b10011,0b01101],
  'v': [0b00000,0b00000,0b10001,0b10001,0b10001,0b01010,0b00100],
  'w': [0b00000,0b00000,0b10001,0b10001,0b10101,0b10101,0b01010],
  'y': [0b00000,0b00000,0b10001,0b10001,0b01111,0b00001,0b01110],
  '-': [0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000],
  '>': [0b01000,0b00100,0b00010,0b00001,0b00010,0b00100,0b01000],
  '.': [0b00000,0b00000,0b00000,0b00000,0b00000,0b01100,0b01100],
  ',': [0b00000,0b00000,0b00000,0b00000,0b00100,0b00100,0b01000],
  ':': [0b00000,0b01100,0b01100,0b00000,0b01100,0b01100,0b00000],
  '(': [0b00010,0b00100,0b01000,0b01000,0b01000,0b00100,0b00010],
  ')': [0b01000,0b00100,0b00010,0b00010,0b00010,0b00100,0b01000],
  '/': [0b00001,0b00010,0b00010,0b00100,0b01000,0b01000,0b10000],
  '+': [0b00000,0b00100,0b00100,0b11111,0b00100,0b00100,0b00000],
  '1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  '?': [0b01110,0b10001,0b00001,0b00110,0b00100,0b00000,0b00100],
  'J': [0b00111,0b00010,0b00010,0b00010,0b10010,0b10010,0b01100],
  'Z': [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  'j': [0b00010,0b00000,0b00110,0b00010,0b00010,0b10010,0b01100],
  'z': [0b00000,0b00000,0b11111,0b00010,0b00100,0b01000,0b11111],
  'q': [0b00000,0b00000,0b01101,0b10011,0b01111,0b00001,0b00001],
  'x': [0b00000,0b00000,0b10001,0b01010,0b00100,0b01010,0b10001],
};

function drawText(pixels, text, startX, startY, color, scale) {
  let cx = startX;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) { cx += 4 * scale; continue; }
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + col * scale + sx;
              const py = startY + row * scale + sy;
              if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
                pixels[py][px] = color;
              }
            }
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawArrow(pixels, x1, y1, x2, y2, color, thickness) {
  // Simple horizontal arrow
  for (let t = 0; t <= 1; t += 0.002) {
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    for (let d = -thickness; d <= thickness; d++) {
      if (y + d >= 0 && y + d < HEIGHT && x >= 0 && x < WIDTH) {
        pixels[y + d][x] = color;
      }
    }
  }
  // Arrowhead
  for (let i = 0; i < 15; i++) {
    for (let d = -i; d <= i; d++) {
      const px = x2 - i;
      const py = y2 + d;
      if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
        pixels[py][px] = color;
      }
    }
  }
}

// Build image
const bg1 = [15, 15, 26];
const bg2 = [10, 10, 20];
const accent = [108, 92, 231];
const white = [240, 240, 245];
const dim = [100, 100, 130];
const hint = [70, 70, 95];

const pixels = [];
for (let y = 0; y < HEIGHT; y++) {
  const row = [];
  const t = y / HEIGHT;
  for (let x = 0; x < WIDTH; x++) {
    row.push([
      Math.round(bg1[0] + (bg2[0] - bg1[0]) * t),
      Math.round(bg1[1] + (bg2[1] - bg1[1]) * t),
      Math.round(bg1[2] + (bg2[2] - bg1[2]) * t),
    ]);
  }
  pixels.push(row);
}

// Title
drawText(pixels, "PASTERACK", 180, 30, accent, 3);

// Arrow from app icon area to Applications
drawArrow(pixels, 195, 200, 340, 200, dim, 1);

// Instructions at bottom
drawText(pixels, "Drag to Applications to install", 115, 290, dim, 2);
drawText(pixels, "First open: right-click > Open", 120, 320, hint, 2);

const png = createPNG(WIDTH, HEIGHT, pixels);

const outDir = path.join(__dirname, "..", "build");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "dmg-bg.png"), png);
console.log("DMG background generated: build/dmg-bg.png");
