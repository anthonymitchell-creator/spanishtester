// Renders the PNG app icons from public/icon.svg using headless Chrome, so they match the SVG exactly.
//   icon-192.png / icon-512.png   rounded square, as in the SVG ("any" purpose)
//   icon-maskable-512.png         full-bleed teal with the glyph inside the 80% safe zone (Android adaptive icons)
//   apple-touch-icon.png          180px full-bleed (iOS rounds it itself)
// Usage: node scripts/make-icons.mjs   (needs playwright-core and a local Chrome/Edge)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8');
const glyph = svg.match(/<text[\s\S]*?<\/text>/)[0];

// Full-bleed variant: no rounded corners, glyph scaled to 72% around the centre.
const fullBleed = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f766e"/>` +
  `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${glyph}</g></svg>`;

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
async function render(svgText, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">` +
      svgText.replace('<svg ', `<svg width="${size}" height="${size}" `) +
      `</body></html>`,
  );
  await page.screenshot({ path: path.join(root, 'public', out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', out);
}
await render(svg, 192, 'icon-192.png');
await render(svg, 512, 'icon-512.png');
await render(fullBleed(0.8), 512, 'icon-maskable-512.png');
await render(fullBleed(0.85), 180, 'apple-touch-icon.png');
await browser.close();
