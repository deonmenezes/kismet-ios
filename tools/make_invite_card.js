// Re-renders the iMessage invite card (the brand's og-image, 1200x630) with the repositioned tagline.
// Same vector source and layout as E:/kismet-brand/src/build.js (surface, logoInline, OG image); only the tagline differs.
// Run: NODE_PATH=E:/agent-dates/node_modules node tools/make_invite_card.js <out.png> (tools/make_imessage_assets.py calls it).
// Needs the brand kit at E:/kismet-brand, sharp (from E:/agent-dates/node_modules) and the Windows fonts Candara/Corbel.
const sharp = require('sharp');
const { PALETTE: P, mark, markBounds, spark } = require('E:/kismet-brand/src/mark');
const { wordmark } = require('E:/kismet-brand/src/wordmark');

const svgDoc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
function markIn(x, y, w, h, opts = {}, lift = 0.015) {
  const b = markBounds(opts.geom);
  const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
  const s = Math.min(w / bw, h / bh);
  const tx = x + w / 2 - (b.minX + bw / 2) * s;
  const ty = y + h / 2 - (b.minY + bh / 2) * s - h * lift;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})">${mark(opts)}</g>`;
}
const surface = (w, h) => `<defs><radialGradient id="kbg" cx="0.5" cy="0.22" r="0.85" gradientUnits="objectBoundingBox">
    <stop offset="0" stop-color="#3B2149"/><stop offset="0.5" stop-color="#25152F"/><stop offset="1" stop-color="${P.plum}"/>
  </radialGradient></defs><rect width="${w}" height="${h}" fill="url(#kbg)"/>`;
function logoInline(x, y, height) {
  const wm = wordmark({ color: P.cream, sparkColor: P.marigold });
  const capTop = 26.5, base = 105.5;
  const mh = (base - capTop) * 1.28, mw = mh * 1.06, gap = 22;
  const my = (capTop + base) / 2 - mh / 2;
  const top = Math.min(my, wm.top), H = Math.max(my + mh, base) - top;
  const s = height / H;
  return { width: (mw + gap + wm.width) * s, svg: `<g transform="translate(${x} ${y}) scale(${s}) translate(0 ${-top})">${markIn(0, my, mw, mh, {}, 0)}<g transform="translate(${mw + gap} 0)">${wm.svg}</g></g>` };
}

const OW = 1200, OH = 630;
const lx = (OW - logoInline(0, 0, 190).width) / 2;
const og = svgDoc(OW, OH, `${surface(OW, OH)}
  <g fill="none" stroke-linecap="round">
    <ellipse cx="600" cy="300" rx="560" ry="210" transform="rotate(-8 600 300)" stroke="${P.coral}" stroke-opacity="0.16" stroke-width="3"/>
    <ellipse cx="600" cy="300" rx="540" ry="180" transform="rotate(7 600 300)" stroke="${P.cream}" stroke-opacity="0.09" stroke-width="3"/>
  </g>
  ${spark(140, 150, 16, 0.18, P.marigold)}${spark(1070, 470, 12, 0.18, P.cream)}${spark(1010, 120, 9, 0.18, P.marigold)}
  ${logoInline(lx, 140, 190).svg}
  <text x="600" y="450" text-anchor="middle" font-family="Candara, Corbel, 'Segoe UI', sans-serif" font-size="48" font-weight="700" fill="${P.cream}" letter-spacing="0.3">Agents meet first. <tspan fill="${P.coral}">You meet the right people.</tspan></text>
  <text x="600" y="540" text-anchor="middle" font-family="Candara, Corbel, 'Segoe UI', sans-serif" font-size="22" fill="#C9A9BF" letter-spacing="3">PRIVATE AI INTROS  ·  FOR YOUR VILLAGE</text>`);

sharp(Buffer.from(og), { density: 72 }).flatten({ background: P.plum }).png().toFile(process.argv[2]).then((i) => console.log(i.width, i.height));
