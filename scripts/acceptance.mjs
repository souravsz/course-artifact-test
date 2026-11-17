// End-to-end acceptance checks. Requires the dev server (npm run dev) and a local Edge or Chrome.
// Usage: npm run test:acceptance   (BASE_URL defaults to http://localhost:5173, BROWSER_CHANNEL to msedge)
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const CHANNEL = process.env.BROWSER_CHANNEL ?? 'msedge';
const LESSON_ID = 'wm-101';
const QUIZ_ANSWERS = [0, 1, 1, 2, 1]; // test fixture for the bundled sample lesson

let failures = 0;
// innerText reflects CSS text-transform (labels are uppercase), so compare case-insensitively.
const has = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ channel: CHANNEL, headless: process.env.HEADED ? false : true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('pageerror:', e.message));

const card = () => page.getByTestId(`course-${LESSON_ID}`);
const lessonFrame = async () => {
  await page.waitForSelector('iframe[sandbox="allow-scripts"]');
  for (let i = 0; i < 50; i++) {
    const f = page.frames().find((fr) => fr.url().includes('/lessons/'));
    if (f) return f;
    await page.waitForTimeout(100);
  }
  throw new Error('lesson frame not found');
};
const text = (testId) => page.getByTestId(testId).innerText();
const finishBtn = () => page.getByRole('button', { name: 'Finish course' });
const storedRecord = () =>
  page.evaluate((id) => JSON.parse(localStorage.getItem(`lms:progress:stu-001:${id}`) ?? 'null'), LESSON_ID);

// Fresh state
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);

// 1. Dashboard: 0%, Not started
await card().waitFor();
check('1 card shows 0%', (await card().getByTestId('card-percent').innerText()) === '0%');
check('1 card shows Not started', has(await card().innerText(), 'Not started'));
check('1 locked cards present', (await page.getByText('Coming soon').count()) >= 2);

// 2. Open: greets Priya, progress updates live
await card().getByRole('button', { name: 'Start' }).click();
check('2 URL hash set', page.url().endsWith(`#/learn/${LESSON_ID}`), page.url());
let frame = await lessonFrame();
await frame.waitForFunction(() => document.querySelector('#learnerName')?.textContent === 'Priya');
check('2 lesson greets Priya', (await frame.locator('#learnerName').innerText()) === 'Priya');
await page.waitForFunction(() => document.querySelector('[data-testid=panel-percent]')?.textContent !== '0%');
check('2 panel progress > 0', (await text('panel-percent')) !== '0%', await text('panel-percent'));
check('2 status In progress', has(await text('player-status'), 'In progress'));

// Forged completion from outside the iframe must be ignored
await page.evaluate(() =>
  window.postMessage({ source: 'wtcm-lesson', type: 'lesson_completed', attemptId: 'x', data: { success: 'passed' } }, '*'),
);
// Forged completion from inside the iframe with a wrong attempt id must be ignored
await frame.evaluate(() =>
  window.parent.postMessage({ source: 'wtcm-lesson', type: 'lesson_completed', attemptId: 'forged', data: { success: 'passed' } }, '*'),
);
await page.waitForTimeout(300);
check('5 forged lesson_completed ignored', (await storedRecord()).status === 'in_progress');
check('5 Finish disabled after forged messages', await finishBtn().isDisabled());

// 3. Screen 4, reload, resume on screen 4
await frame.evaluate(() => window.WTCMLesson.goTo(3));
await page.waitForFunction(() => document.querySelector('[data-testid=panel-screen]')?.textContent?.startsWith('4'));
check('3 panel shows screen 4', (await text('panel-screen')).startsWith('4'), await text('panel-screen'));
const beforeReload = await storedRecord();
check('3 suspendData saved at slide 3', beforeReload?.suspendData?.slide === 3);
await page.reload();
check('3 player reopened after reload', (await finishBtn().count()) === 1);
frame = await lessonFrame();
await frame.waitForSelector('.slide.active');
await page.waitForTimeout(500);
const activeIdx = await frame.evaluate(() => [...document.querySelectorAll('.slide')].findIndex((s) => s.classList.contains('active')));
check('3 lesson resumed on screen 4', activeIdx === 3, `active screen ${activeIdx + 1}`);
check('3 same attempt id reused', (await storedRecord()).attemptId === beforeReload.attemptId);

// 4. Switch tab and come back
const tabsBefore = Number(await text('panel-tabs'));
const other = await context.newPage();
await other.goto('about:blank');
await other.bringToFront();
await page.waitForTimeout(1500);
await page.bringToFront();
await page.waitForTimeout(500);
let tabsAfter = Number(await text('panel-tabs'));
if (tabsAfter === tabsBefore) {
  // Headless browsers may not change visibility on bringToFront; simulate the lesson's visibility change instead.
  console.log('      note: real tab switch not detected in this browser mode, simulating visibilitychange');
  await frame.evaluate(async () => {
    const set = (v) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    set(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 1200));
    set(false);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  tabsAfter = Number(await text('panel-tabs'));
}
await other.close();
check('4 tab switches +1', tabsAfter === tabsBefore + 1, `${tabsBefore} -> ${tabsAfter}`);
check('4 time away shown', (await text('panel-away')) !== '0s', await text('panel-away'));
check('4 warning chip shown', has(await text('panel-warnings'), 'Switched away'));

// 5. Finish disabled until final screen
await frame.evaluate(() => window.WTCMLesson.goTo(6));
await frame.waitForSelector('#quizBox .opt');
for (let i = 0; i < QUIZ_ANSWERS.length; i++) {
  await frame.locator(`#quizBox .opt[data-j="${QUIZ_ANSWERS[i]}"]`).click();
  await frame.locator('#quizBox .q-actions .btn').click();
}
await page.waitForFunction(() => document.querySelector('[data-testid=panel-quiz]')?.textContent?.includes('5/5'));
check('5 quiz result recorded', has(await text('panel-quiz'), '5/5'), await text('panel-quiz'));
check('5 Finish still disabled before final screen', await finishBtn().isDisabled());
check('5 status not completed early', (await storedRecord()).status === 'in_progress');
await frame.locator('#nextBtn').click();
await page
  .waitForFunction(() => [...document.querySelectorAll('header button')].some((b) => b.textContent === 'Finish course' && !b.disabled), null, { timeout: 5000 })
  .catch(() => {});
check('5 Finish enabled after lesson_completed', await finishBtn().isEnabled());
check('5 player status Completed · Passed', has(await text('player-status'), 'Completed · Passed'));

// 10. Desktop full screen from the header, then finish from inside full screen
const desktopScreen = page.getByTestId('lesson-screen');
await page.getByTestId('header-fullscreen').click();
await page.waitForFunction(() => document.querySelector('[data-testid=lesson-screen]')?.dataset.fullscreen === 'true');
await page.waitForTimeout(300);
const dbox = await desktopScreen.boundingBox();
check('10 desktop header button opens full screen', Math.round(dbox.width) === 1440 && Math.round(dbox.height) === 900, `${Math.round(dbox.width)}x${Math.round(dbox.height)}`);
const barFinish = desktopScreen.getByRole('button', { name: 'Finish course' });
check('10 Finish available inside full screen', await barFinish.isVisible());

// 6. After completion: card + review mode (finishing from full screen also exits it)
await barFinish.click();
await page.getByRole('status').waitFor();
check('6 success toast', has(await page.getByRole('status').innerText(), 'Course completed'));
const cardText = await card().innerText();
check('6 card Completed · Passed', has(cardText, 'Completed · Passed'));
check('6 card shows quiz score', has(cardText, '5/5'));
check('6 card 100%', (await card().getByTestId('card-percent').innerText()) === '100%');
check('6 stat Completed = 1', (await text('stat-completed')) === '1');
await card().getByRole('button', { name: 'Review' }).click();
frame = await lessonFrame();
await page.waitForFunction(() => document.querySelector('[data-testid=session-panel]')?.textContent?.includes('Review mode'));
check('6 reopen uses review mode', has(await page.getByTestId('session-panel').innerText(), 'Review mode'));
check('6 Finish disabled in review', await finishBtn().isDisabled());

// 9. Mobile: inline 16:9 "video", full screen, landscape — without reloading the lesson
const initCount = () =>
  page.evaluate(
    (id) => JSON.parse(localStorage.getItem(`lms:events:stu-001:${id}`) ?? '[]').filter((e) => e.type === 'host:init').length,
    LESSON_ID,
  );
const stage = page.getByTestId('lesson-stage');
const canvasBox = () => page.getByTestId('lesson-canvas').boundingBox();
const size = (b) => `${Math.round(b.width)}x${Math.round(b.height)}`;
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const inline = await stage.boundingBox();
check('9 mobile inline player is 16:9', near(inline.width / inline.height, 16 / 9, 0.02), size(inline));
const inlineCanvas = await canvasBox();
check('9 mobile inline lesson scaled to fit like a video', near(inlineCanvas.width, inline.width) && near(inlineCanvas.height, inline.height), size(inlineCanvas));
check('9 lesson laid out landscape (>= 768x432) inside', await frame.evaluate(() => innerWidth >= 768 && innerHeight >= 432), await frame.evaluate(() => `${innerWidth}x${innerHeight}`));
const initsBefore = await initCount();
await frame.evaluate(() => window.WTCMLesson.goTo(2));
await page.waitForTimeout(600);
for (const variant of ['native', 'fallback']) {
  if (variant === 'fallback') {
    // Simulate iPhone Safari, which has no element Fullscreen API.
    await page.evaluate(() => {
      HTMLElement.prototype.requestFullscreen = undefined;
      HTMLElement.prototype.webkitRequestFullscreen = undefined;
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('screen-fullscreen-toggle').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=lesson-screen]')?.dataset.fullscreen === 'true');
  await page.waitForTimeout(400);
  const full = await page.getByTestId('lesson-screen').boundingBox();
  check(`9 ${variant} full screen fills phone`, Math.round(full.width) === 390 && Math.round(full.height) === 844, size(full));
  const portrait = await canvasBox();
  check(`9 ${variant} portrait: 16:9 letterbox`, near(portrait.width / portrait.height, 16 / 9, 0.02), size(portrait));
  check(`9 ${variant} portrait: rotate hint shown`, await page.getByTestId('rotate-hint').isVisible());

  // Turn the phone sideways.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  const land = await canvasBox();
  const landStage = await stage.boundingBox();
  check(`9 ${variant} landscape: lesson fills the screen`, near(land.width, 844) && near(land.height, landStage.height), size(land));
  check(`9 ${variant} landscape: rotate hint hidden`, (await page.getByTestId('rotate-hint').count()) === 0);
  const idx = await frame.evaluate(() => [...document.querySelectorAll('.slide')].findIndex((s) => s.classList.contains('active')));
  check(`9 ${variant} lesson stays on same screen`, idx === 2, `screen ${idx + 1}`);
  await page.getByTestId('screen-fullscreen-toggle').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid=lesson-screen]')?.dataset.fullscreen);
}
check('9 lesson not reloaded by full screen or rotation', (await initCount()) === initsBefore);
await page.setViewportSize({ width: 1440, height: 900 });

await page.getByRole('button', { name: '← Back to dashboard' }).click();

// 7. Reset
await card().getByRole('button', { name: 'Reset progress' }).click();
await page.waitForFunction(
  (id) => document.querySelector(`[data-testid=course-${id}]`)?.textContent?.includes('Not started'),
  LESSON_ID,
);
check('7 reset returns to Not started', has(await card().innerText(), 'Not started'));
check('7 reset returns to 0%', (await card().getByTestId('card-percent').innerText()) === '0%');
check('7 stored record removed', (await storedRecord()) === null);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
