import { deflateSync, inflateSync } from "node:zlib";

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunks(png) {
  const out = [];
  let at = 8;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    out.push({
      type: png.toString("ascii", at + 4, at + 8),
      data: png.subarray(at + 8, at + 8 + length),
    });
    at += 12 + length;
  }
  return out;
}

function decode(png) {
  const parts = chunks(png);
  const ihdr = parts.find((c) => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const colour = ihdr[9];
  if (depth !== 8 || (colour !== 2 && colour !== 6)) {
    throw new Error(`only 8-bit RGB or RGBA is handled, got depth ${depth} colour ${colour}`);
  }

  const channels = colour === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(parts.filter((c) => c.type === "IDAT").map((c) => c.data)));
  const rows = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= channels ? prior[x - channels] : 0;
      const v = line[x];
      if (filter === 0) out[x] = v;
      else if (filter === 1) out[x] = (v + a) & 0xff;
      else if (filter === 2) out[x] = (v + b) & 0xff;
      else if (filter === 3) out[x] = (v + ((a + b) >> 1)) & 0xff;
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        out[x] = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    }
  }

  if (channels === 3) return { width, height, rows };
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, o = 0; i < rows.length; i += 4, o += 3) {
    rgb[o] = rows[i];
    rgb[o + 1] = rows[i + 1];
    rgb[o + 2] = rows[i + 2];
  }
  return { width, height, rows: rgb };
}

function encode(width, height, rows) {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rows.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(CRC(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function sideBySide(leftPng, rightPng) {
  const left = decode(leftPng);
  const right = decode(rightPng);
  if (left.height !== right.height) {
    throw new Error(`heights differ: ${left.height} and ${right.height}`);
  }

  const width = left.width + right.width;
  const rows = Buffer.alloc(width * left.height * 3);
  for (let y = 0; y < left.height; y++) {
    left.rows.copy(rows, y * width * 3, y * left.width * 3, (y + 1) * left.width * 3);
    right.rows.copy(
      rows,
      y * width * 3 + left.width * 3,
      y * right.width * 3,
      (y + 1) * right.width * 3,
    );
  }
  return { png: encode(width, left.height, rows), width, height: left.height };
}
