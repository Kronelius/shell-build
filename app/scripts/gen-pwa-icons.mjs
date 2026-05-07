// One-shot generator for PWA icons. Composites the Rainier logo onto a
// brand-colored square at the sizes the PWA manifest references. Run via:
//   node scripts/gen-pwa-icons.mjs
// Re-run only when the logo or brand color changes.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SRC = join(root, 'public', 'rainier-facilities-logo.png');
const OUT = (name) => join(root, 'public', name);
const BG = { r: 0x21, g: 0x22, b: 0x69, alpha: 1 }; // --color-brand-primary-500

async function makeIcon(size, padPct, outFile) {
  const inner = Math.round(size * (1 - 2 * padPct));
  const logo = await sharp(SRC)
    .resize({ width: inner, height: inner, fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(OUT(outFile));
  console.log(`wrote ${outFile} (${size}x${size}, pad ${(padPct * 100).toFixed(0)}%)`);
}

await makeIcon(192, 0.10, 'icon-192.png');
await makeIcon(512, 0.10, 'icon-512.png');
await makeIcon(512, 0.20, 'icon-maskable-512.png');
await makeIcon(180, 0.10, 'apple-touch-icon.png');
