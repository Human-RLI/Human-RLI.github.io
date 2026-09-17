/* HumanRLI 2026 — flyer generator
 *
 * Renders flyer.html at exact A4 size and writes flyer.png + flyer.pdf.
 * Uses puppeteer-core against the locally installed Chrome, so there is no
 * ~300 MB Chromium download.
 *
 *   npm install
 *   npm run flyer
 *
 * Override the browser with CHROME_PATH=/path/to/chrome if needed.
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const A4 = { width: 794, height: 1123 }; // A4 @96dpi
const SCALE = 2;                          // 2x for a crisp 1588x2246 PNG
const PORT = 8123;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error(
      'No Chrome found. Set CHROME_PATH=/path/to/chrome, e.g.\n' +
      '  CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run flyer'
    );
  }
  return hit;
}

/* Serve the repo so flyer.html can load assets/ over http:// rather than file://. */
function serve(root, port) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const root = __dirname;
  const server = await serve(root, PORT);
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ ...A4, deviceScaleFactor: SCALE });
    await page.emulateMediaType('screen');
    await page.goto(`http://127.0.0.1:${PORT}/flyer.html`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);

    // Warn loudly if the design outgrew one page instead of silently cropping.
    // A flex page can hide a too-tall design by squashing a section instead of
    // overflowing, so check the page box AND every section's natural height.
    const fit = await page.evaluate(() => {
      const page = document.querySelector('.page');
      const squashed = [...document.querySelectorAll('.page > *, .bd > *')]
        .filter((el) => el.scrollHeight > el.clientHeight + 1)
        .map((el) => ({
          sel: el.className || el.tagName.toLowerCase(),
          over: el.scrollHeight - el.clientHeight,
        }));
      return { over: page.scrollHeight - page.clientHeight, squashed };
    });
    if (fit.over > 1) {
      console.warn(`WARNING: content is ${fit.over}px taller than one A4 page; trim flyer.html.`);
    }
    for (const s of fit.squashed) {
      console.warn(`WARNING: "${s.sel}" is squashed by ${s.over}px and its content is clipped.`);
    }

    const el = await page.$('.page');
    await el.screenshot({ path: path.join(root, 'flyer.png'), type: 'png' });
    console.log(`flyer.png  ${A4.width * SCALE}x${A4.height * SCALE}`);

    // Wrap the PNG in an exactly-A4 page so the PDF matches the render 1:1.
    const b64 = fs.readFileSync(path.join(root, 'flyer.png')).toString('base64');
    const pdfPage = await browser.newPage();
    await pdfPage.setContent(
      `<html><body style="margin:0"><img src="data:image/png;base64,${b64}" ` +
      `style="width:210mm;height:297mm;display:block"></body></html>`,
      { waitUntil: 'load' }
    );
    await pdfPage.pdf({
      path: path.join(root, 'flyer.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    console.log('flyer.pdf  A4');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
