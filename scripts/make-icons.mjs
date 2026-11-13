// Generates simple PNG app icons (teal rounded square with a white "ñ" tilde mark) without dependencies.
import fs from 'node:fs';
import zlib from 'node:zlib';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const teal = [15, 118, 110], white = [255, 255, 255];
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // "n" shape: two stems + arch, plus a tilde wave above
      const stroke = 0.075;
      const inLeft = u > 0.3 && u < 0.3 + stroke * 1.4 && v > 0.42 && v < 0.78;
      const inRight = u > 0.7 - stroke * 1.4 && u < 0.7 && v > 0.52 && v < 0.78;
      const dx = u - 0.5, dy = v - 0.56, r = Math.hypot(dx / 1.0, dy / 0.75);
      const inArch = v < 0.56 && r > 0.2 - stroke * 0.6 && r < 0.2 + stroke * 0.6 && u > 0.3;
      const tildeY = 0.3 + 0.035 * Math.sin((u - 0.32) * Math.PI * 2 / 0.36);
      const inTilde = u > 0.32 && u < 0.68 && Math.abs(v - tildeY) < stroke * 0.45;
      const c = inLeft || inRight || inArch || inTilde ? white : teal;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [192, 512]) fs.writeFileSync(`public/icon-${s}.png`, png(s));
console.log('icons written');
