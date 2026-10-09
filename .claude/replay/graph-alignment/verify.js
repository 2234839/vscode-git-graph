/**
 * Graph/Table 对齐 + 全功能冒烟 回放断言脚本（红/绿）— 最终版
 *
 * 运行方式：仓库根 `python3 -m http.server 8641 --bind 127.0.0.1`，浏览器打开
 * harness.html，将本文件内容作为 Playwright 代码执行。
 *
 * 对齐断言（≤1.0px）：boot(500) / loadMore(→1000) / refresh(→450) / cdv 展开第 200 行。
 * 功能冒烟：dateSanity / headDot / refLabelColour / contextMenu / findWidget / settingsWidget。
 *
 * 已知坑（勿回退）：
 *  - 隐藏页面 rAF 永不触发，harness 已 polyfill，page 无需前置；
 *  - 隐藏页面 Playwright 可信点击过不了可见性检查，UI 事件一律用合成事件 + clientX/clientY；
 *  - contextMenuActionsVisibility 必须传完整结构（harness 已内置）；
 *  - 查找关键词必须在已加载行数范围内（boot 500 行 → 用 'Commit number 250'）；
 *  - findWidget 关闭 = 移除 active class + input disabled，不是加 disabled class。
 */
const THRESHOLD = 1.0;

await page.goto('http://127.0.0.1:8641/.claude/replay/graph-alignment/harness.html');
await page.reload();
await page.waitForFunction(
	() => document.querySelectorAll('#commitTable tr.commit').length === 500,
	null,
	{ timeout: 25000 },
);
const boot = await page.evaluate(() => window.__gg.measure());

const dateSanity = await page.evaluate(() => {
	const t = document.querySelector('#commitTable tr.commit td.dateCol').textContent;
	return { sample: t, pass: /2025/.test(t) };
});
const headDot = await page.evaluate(
	() => ({ pass: document.querySelector('tr.commit[data-id="0"] .commitHeadDot') !== null }),
);
const refLabelColour = await page.evaluate(() => {
	const svg = document.querySelector('tr.commit[data-id="0"] .gitRef svg');
	if (!svg) return { pass: false, reason: 'no gitRef svg' };
	const bg = getComputedStyle(svg).backgroundColor;
	return { pass: bg !== 'rgba(0, 0, 0, 0)', colour: bg };
});

await page.evaluate(() => window.__gg.loadMore());
await page.waitForFunction(
	() => document.querySelectorAll('#commitTable tr.commit').length === 1000,
	null,
	{ timeout: 20000 },
);
const loadMore = await page.evaluate(() => window.__gg.measure());

await page.evaluate(() => { window.__gg.setTotal(450); window.__gg.refresh(); });
await page.waitForFunction(
	() => document.querySelectorAll('#commitTable tr.commit').length === 450,
	null,
	{ timeout: 20000 },
);
const refresh = await page.evaluate(() => window.__gg.measure());

const contextMenu = await page.evaluate(async () => {
	document.querySelector('tr.commit[data-id="5"]').dispatchEvent(
		new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 200 }),
	);
	await new Promise((r) => setTimeout(r, 150));
	const menu = document.querySelector('ul.contextMenu');
	const opened = menu !== null && menu.children.length > 0;
	const items = opened ? menu.children.length : 0;
	document.body.click();
	await new Promise((r) => setTimeout(r, 150));
	const closed = document.querySelector('ul.contextMenu') === null;
	return { pass: opened && closed, opened, items, closed };
});

const findWidget = await page.evaluate(async () => {
	document.getElementById('findBtn').click();
	await new Promise((r) => setTimeout(r, 150));
	const input = document.getElementById('findInput');
	if (!input || input.disabled) return { pass: false, reason: 'findInput missing/disabled' };
	input.value = 'Commit number 250';
	input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
	await new Promise((r) => setTimeout(r, 700));
	const position = document.getElementById('findPosition').textContent;
	document.getElementById('findClose').click();
	await new Promise((r) => setTimeout(r, 200));
	const w = document.querySelector('.findWidget');
	const closed = (w === null || !w.classList.contains('active')) && input.disabled === true;
	return { pass: /\d+ of \d+/.test(position) && closed, position, closed };
});

const settingsWidget = await page.evaluate(async () => {
	document.getElementById('settingsBtn').click();
	await new Promise((r) => setTimeout(r, 300));
	const content = document.getElementById('settingsContent');
	const opened = content !== null && content.offsetHeight > 0;
	document.getElementById('settingsClose').click();
	await new Promise((r) => setTimeout(r, 200));
	const w = document.querySelector('.settingsWidget');
	const closed = w === null || !w.classList.contains('active');
	return { pass: opened && closed, opened, closed };
});

await page.evaluate(() => document.querySelector('tr.commit[data-id="200"]').click());
await page.waitForFunction(() => document.getElementById('cdv') !== null, null, { timeout: 10000 });
await page.waitForTimeout(400);
const cdv = await page.evaluate(() => {
	const m = window.__gg.measure();
	m.cdvHeight = document.getElementById('cdv').getBoundingClientRect().height;
	return m;
});

const scenarios = { boot, loadMore, refresh, cdv };
const features = { dateSanity, headDot, refLabelColour, contextMenu, findWidget, settingsWidget };
const failedAlign = Object.entries(scenarios).filter(([, v]) => v.maxErr > THRESHOLD);
const failedFeatures = Object.entries(features).filter(([, v]) => !v.pass);
const pass = failedAlign.length === 0 && failedFeatures.length === 0;
const label = pass
	? 'HARNESS PASS (align 4 + features 6)'
	: 'FAIL align:[' + failedAlign.map(([k]) => k).join(',')
		+ '] features:[' + failedFeatures.map(([k]) => k).join(',') + ']';
await page.evaluate((v) => window.__gg.setVerdict(v.text, v.ok), { text: label, ok: pass });
return { pass, threshold: THRESHOLD, scenarios, features };
