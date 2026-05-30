import {prepareDoneBtn, addOption, changeHandler, hashChangeHandler, inputHandler} from './test-page-common.js';
import type {} from 'prismjs'; // eslint-disable-line n/no-extraneous-import

declare interface Test {
	desc: string;
	wikitext?: string;
	html?: string;
	render?: string;
}

declare interface DiffPart {
	value: string;
	added: boolean;
	removed: boolean;
}
declare interface DiffEngine {
	diffWordsWithSpace(oldStr: string, newStr: string): DiffPart[];
}
declare global {
	const Diff: DiffEngine | undefined;
}

const ignoredGroups = new Set([
	// <imagemap>
	'imageMapParserTests',
	// <ref>
	'subReferencingTests',
]);

const isIframe = self !== top; // eslint-disable-line no-restricted-globals

/**
 * 移除元素的指定类名
 * @param ele 元素
 * @param cls 类名
 */
const removeClass = (ele: Element, ...cls: string[]): void => {
	ele.classList.remove(...cls);
	if (ele.classList.length === 0) {
		ele.removeAttribute('class');
	}
};

/**
 * 双击切换源代码视图
 * @param container 容器
 * @param container1 容器1
 * @param container2 容器2
 * @param btn `Diff`按钮
 * @param e 事件对象
 */
const dblClickHandler = (
	container: HTMLElement,
	container1: HTMLElement,
	container2: HTMLElement,
	btn?: HTMLButtonElement,
	e?: MouseEvent,
): void => {
	e?.preventDefault();
	const isSource = Boolean(container.dataset['source']);
	if (btn) {
		btn.disabled = isSource;
	}
	if (isSource) {
		container.removeAttribute('data-source');
		container1.innerHTML = container1.textContent;
		container2.innerHTML = container2.textContent;
	} else {
		container.dataset['source'] = '1';
		const pre1 = document.createElement('pre'),
			pre2 = document.createElement('pre'),
			code1 = document.createElement('code'),
			code2 = document.createElement('code');
		code1.textContent = container1.innerHTML;
		code2.textContent = container2.innerHTML;
		pre1.className = 'language-html';
		pre2.className = 'language-html';
		pre1.append(code1);
		pre2.append(code2);
		container1.replaceChildren(pre1);
		container2.replaceChildren(pre2);
		// @ts-expect-error Prism global
		Prism.highlightAllUnder(container);
	}
};

/**
 * 重绘内容
 * @param container 容器
 * @param container1 容器1
 * @param container2 容器2
 * @param html 容器1内容
 * @param render 容器2内容
 * @param isGH 是否为 GitHub Page
 */
const repaint = (
	container: HTMLElement,
	container1: HTMLElement,
	container2: HTMLElement,
	html?: string,
	render?: string,
	isGH?: boolean,
): void => {
	container.removeAttribute('data-source');
	if (html === undefined) {
		container.style.display = 'none';
	} else {
		container.style.display = '';
		container1.innerHTML = html!;
		container2.innerHTML = render ?? '';
		const classes = ['mw-html-heading'],
			withClasses = container1.querySelectorAll(classes.map(c => `.${c}`).join()),
			empty = container1.querySelectorAll('.mw-empty-elt'),
			typeofs = container1.querySelectorAll('span[typeof]'),
			imgs = container1.querySelectorAll('img'),
			toRemove = container1.querySelectorAll('.mw-editsection, .mw-ext-cite-error'),
			tocTitles = container1.querySelectorAll('.toctitle'),
			anchors = container1.querySelectorAll('a[href]') as Iterable<HTMLAnchorElement>;
		if (!isGH) {
			for (const ele of withClasses) {
				removeClass(ele, ...classes);
			}
			for (const ele of empty) {
				if (ele.childElementCount === 0 && !ele.textContent.trim()) {
					removeClass(ele, 'mw-empty-elt');
				}
			}
			for (const ele of typeofs) {
				ele.removeAttribute('typeof');
			}
			for (const ele of imgs) {
				ele.removeAttribute('srcset');
			}
			for (const ele of tocTitles) {
				ele.removeAttribute('lang');
				ele.removeAttribute('dir');
			}
		}
		for (const ele of toRemove) {
			ele.remove();
		}
		for (const ele of anchors) {
			try {
				const url = new URL(ele.href);
				if (ele.classList.contains('mw-magiclink-pmid')) {
					url.protocol = 'https:';
				}
				if (ele.classList.contains('external')) {
					ele.href = url.href;
				} else if (
					url.origin === location.origin
					&& url.pathname === '/index.php'
					&& url.searchParams.has('title')
				) {
					url.pathname = `/wiki/${
						url.searchParams.get('title')!.replaceAll(':', '%3A')
					}`;
					url.searchParams.delete('title');
					ele.setAttribute('href', url.pathname + url.search);
				}
			} catch {
				ele.removeAttribute('href');
			}
		}
		if (!isGH && container1.innerHTML === container2.innerHTML) {
			dblClickHandler(container, container1, container2);
		}
	}
};

(async () => {
	const key = 'wikiparser-node-done',
		isGH = location.hostname.endsWith('.github.io');
	let reviewed: string[] | null = null;
	if (!isGH) {
		reviewed = JSON.parse(localStorage.getItem(key)!);
		if (!reviewed) {
			reviewed = await (await fetch('./test/reviewed.json')).json();
			localStorage.setItem(key, JSON.stringify(reviewed));
		}
	}
	const tests: Test[] = await (await fetch('./test/parserTests.json')).json(),
		dones = new Set(reviewed),
		toctoggle = 'label[for=toctogglecheckbox]',
		input = document.getElementById('search') as HTMLInputElement,
		select = document.querySelector('select')!,
		btns = document.querySelectorAll('button'),
		btnDone = btns[0]!,
		btnDiff = btns[1]!,
		diffFrame = document.getElementById('diffFrame')!,
		pre = document.querySelector('pre')!,
		container = document.getElementById('frame')!,
		container1 = document.getElementById('frame1')!,
		container2 = document.getElementById('frame2')!;
	wikiparse.setConfig(await (await fetch('./config/default.json')).json() as import('./typings').ConfigData);
	await wikiparse.highlight!(pre, false, true);
	let optgroup: HTMLOptGroupElement | undefined;
	for (let i = 0; i < tests.length; i++) {
		const {desc, html} = tests[i]!;
		optgroup = addOption(
			optgroup,
			select,
			tests,
			dones,
			i,
			!ignoredGroups.has(desc),
			isIframe || html !== undefined,
		);
	}
	select.addEventListener('change', () => {
		const {html, render} = tests[Number(select.value)]!;
		repaint(container, container1, container2, html, render, isGH);
		changeHandler(pre, btnDone, select, tests);
		btnDiff.disabled = true;
		diffFrame.style.display = 'none';
		dispatchEvent(new CustomEvent('casechange'));
	});
	container.addEventListener('click', e => {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.matches(toctoggle)) {
			const checkbox = target.closest('#toc')!.querySelector('input')!;
			checkbox.checked = !checkbox.checked;
		}
	}, {capture: true});
	container.addEventListener('dblclick', e => {
		if (!(e.target as HTMLElement).matches(toctoggle)) {
			dblClickHandler(container, container1, container2, btnDiff, e);
		}
	});
	prepareDoneBtn(btnDone, select, tests, dones, key);
	inputHandler(input, select, dones);
	hashChangeHandler(select, tests);
	if (!isGH) {
		btnDiff.style.display = '';
		btnDiff.addEventListener('click', () => {
			(async () => {
				if (typeof Diff === 'undefined') {
					await import('https://cdn.jsdelivr.net/npm/diff');
				}
				diffFrame.innerHTML = '';
				diffFrame.style.display = '';
				for (const part of Diff!.diffWordsWithSpace(container1.textContent, container2.textContent)) {
					const span = document.createElement('span');
					span.textContent = part.value;
					if (part.added || part.removed) {
						span.classList.add(`diff-${part.added ? 'added' : 'removed'}`);
						if (!/[^\n]/u.test(part.value)) {
							span.classList.add('diff-empty');
						}
					}
					diffFrame.append(span);
				}
				btnDiff.disabled = true;
			})();
		});
	}
})();
