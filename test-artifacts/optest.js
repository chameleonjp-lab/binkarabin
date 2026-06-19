// Operation test via Playwright (headless chromium).
// Usage: node test-artifacts/optest.js <label>
const path = require('path');
const PW = require('/opt/node22/lib/node_modules/playwright');

const LABEL = process.argv[2] || 'run';
const OUT = path.join(__dirname, LABEL);
const fs = require('fs');
fs.mkdirSync(OUT, true && { recursive: true });

const FILE = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await PW.chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => logs.push(`[requestfailed] ${r.url()} ${r.failure() && r.failure().errorText}`));
  page.on('dialog', d => d.accept());

  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); };

  await page.goto(FILE, { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(400);
  await shot('01-home');

  // Rule screen
  await page.click('#ruleBtn');
  await page.waitForTimeout(150);
  await shot('02-rule');
  await page.click('#ruleBackBtn');

  // Name screen
  await page.click('#startBtn');
  await page.waitForTimeout(150);
  await shot('03-name');

  // Start with empty name -> error
  await page.click('#nameStartBtn');
  await page.waitForTimeout(120);
  await shot('04-name-error');

  // Enter name and start
  await page.fill('#playerName', 'テスト太郎');
  await page.click('#nameStartBtn');
  await page.waitForTimeout(300);
  await shot('05-countdown');
  await page.waitForTimeout(4200); // wait for countdown -> PLAYING
  await shot('06-game-start');

  // Read bottle rects + canvas box for tapping
  const geo = await page.evaluate(() => {
    try {
      const c = document.getElementById('gameCanvas').getBoundingClientRect();
      // state may be reachable via lexical scope
      // eslint-disable-next-line no-undef
      const rects = (typeof state !== 'undefined' && state.rects) ? state.rects.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })) : null;
      return { canvas: { x: c.x, y: c.y, w: c.width, h: c.height }, rects };
    } catch (e) { return { error: String(e) }; }
  });
  logs.push('GEO ' + JSON.stringify(geo));

  // Tap bottle 0 then bottle 4 (empty) as a sample pour, if rects available
  if (geo.rects) {
    const tap = async (i) => {
      const r = geo.rects[i];
      const x = geo.canvas.x + r.x + r.w / 2;
      const y = geo.canvas.y + r.y + r.h / 2;
      await page.mouse.click(x, y);
      await page.waitForTimeout(250);
    };
    await tap(0); await shot('07-selected');
    await tap(4); await shot('08-after-pour');
    await tap(1); await tap(5); await shot('09-after-pour2');
  }

  // HUD values
  const hud = await page.evaluate(() => ({
    time: document.getElementById('timeLabel').textContent,
    moves: document.getElementById('moveLabel').textContent,
    status: document.getElementById('gameStatus').textContent,
  }));
  logs.push('HUD ' + JSON.stringify(hud));

  // Undo button disabled state check
  const undoDisabledAfterUndo = await page.evaluate(async () => {
    // undo all the way then check
    const btn = document.getElementById('undoBtn');
    return { disabled: btn.disabled };
  });
  logs.push('UNDO ' + JSON.stringify(undoDisabledAfterUndo));

  // Retire -> result
  await page.click('#retireBtn');
  await page.waitForTimeout(1500);
  await shot('10-result');

  // ---- Clear path (forced) to verify confetti + submit retry UI ----
  const page2 = await ctx.newPage();
  page2.on('console', m => logs.push(`[p2 ${m.type()}] ${m.text()}`));
  page2.on('pageerror', e => logs.push(`[p2 pageerror] ${e.message}`));
  await page2.goto(FILE, { waitUntil: 'domcontentloaded' }).catch(()=>{});
  await page2.click('#startBtn');
  await page2.fill('#playerName', 'クリア花子');
  await page2.click('#nameStartBtn');
  await page2.waitForTimeout(4200);
  await page2.evaluate(() => { try { finishGame('clear'); } catch (e) { console.log('clearcall err ' + e.message); } });
  await page2.waitForTimeout(500);
  await page2.screenshot({ path: path.join(OUT, '11-clear-confetti.png') });
  await page2.waitForTimeout(2600); // allow 2 attempts + retry button
  await page2.screenshot({ path: path.join(OUT, '12-clear-retry.png') });
  const submitTxt = await page2.evaluate(() => document.getElementById('submitStatus').textContent);
  logs.push('SUBMIT ' + JSON.stringify(submitTxt));

  fs.writeFileSync(path.join(OUT, 'console.log'), logs.join('\n'));
  console.log('LOGS:\n' + logs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
