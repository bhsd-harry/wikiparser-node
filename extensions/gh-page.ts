import {CodeMirror6} from '/codemirror-mediawiki/dist/main.min.js';
import {getMwConfig} from '/codemirror-mediawiki/gh-page.js';
import type {Config, AST} from '../base';

/**
 * Kebab case to Pascal case
 * @param type AST节点类型
 */
const transform = (type?: string): string | undefined =>
	type && type.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');

const keys = new Set(['type', 'childNodes', 'range']);

(async () => {
	// DOM元素
	const textbox = document.querySelector<HTMLTextAreaElement>('#wpTextbox1')!,
		textbox2 = document.querySelector<HTMLTextAreaElement>('#wpTextbox2')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		input2 = document.querySelector<HTMLInputElement>('#wpHighlight')!,
		h2 = document.querySelector('h2')!,
		buttons = [...document.querySelectorAll<HTMLButtonElement>('.tab > button')],
		tabcontents = document.querySelectorAll<HTMLDivElement>('.tabcontent'),
		astContainer = document.getElementById('ast')!,
		highlighters = document.getElementById('highlighter')!.children as HTMLCollectionOf<HTMLDivElement>,
		pres = [...document.getElementsByClassName('highlight')] as [HTMLPreElement, HTMLPreElement];

	// Parser初始化
	const config: Config = await (await fetch('./config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked),
		Linter = new wikiparse.Linter!(input.checked),
		qid = wikiparse.id++;
	highlighters[1 - Number(input.checked)]!.style.display = 'none';

	// CodeMirror初始化
	const instance = new CodeMirror6(textbox2),
		mwConfig = getMwConfig(config);
	instance.prefer([
		'allowMultipleSelections',
		'bracketMatching',
		'closeBrackets',
		'escape',
		'codeFolding',
		'highlightActiveLine',
		'highlightSpecialChars',
		'highlightWhitespace',
		'highlightTrailingWhitespace',
	]);

	/**
	 * 更新第一个文本框
	 * @param str 新文本
	 */
	const updateDoc = (str?: string): void => {
		if (str) {
			textbox.value = str;
		}
		textbox.dispatchEvent(new Event('input'));
	};

	// 切换是否嵌入
	input.addEventListener('change', () => {
		const {checked} = input;
		printer.include = checked;
		Linter.include = checked;
		updateDoc();
		instance.update();
		highlighters[Number(checked)]!.style.display = '';
		highlighters[1 - Number(checked)]!.style.display = 'none';
	});

	/** 切换CodeMirror语言 */
	const setLang = (): void => {
		instance.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
		instance.lint((doc: unknown) => Linter.codemirror(String(doc)));
	};
	setLang();
	input2.addEventListener('change', setLang);

	/**
	 * 创建AST的HTML表示
	 * @param ast AST
	 */
	const createAST = (ast: AST): HTMLDListElement => {
		const entries = Object.entries(ast).filter(([key]) => !keys.has(key)) as [string, string | number | boolean][],
			dl = document.createElement('dl'),
			dt = document.createElement('dt'),
			childNodes = document.createElement('dd'),
			dds = entries.map(([key, value]) => {
				const dd = document.createElement('dd'),
					code = document.createElement('code');
				code.textContent = typeof value === 'string' ? `"${value.replace(/[\\"]/gu, '\\$&')}"` : String(value);
				code.className = typeof value;
				dd.textContent = `${key}: `;
				dd.append(code);
				return dd;
			}),
			lbrace = document.createElement('span'),
			rbrace1 = document.createElement('span'),
			rbrace2 = document.createElement('span'),
			prop = document.createElement('span');
		dt.textContent = transform(ast.type) ?? 'Text';
		dt.className = 'inactive';
		dl.dataset['start'] = String(ast.range[0]);
		dl.dataset['end'] = String(ast.range[1]);
		if ('childNodes' in ast) {
			childNodes.append(...ast.childNodes.map(createAST));
		}
		lbrace.textContent = ' { ';
		rbrace1.textContent = ' }';
		rbrace2.textContent = '}';
		prop.textContent = entries.map(([key]) => key).join(', ');
		dt.append(lbrace, prop, rbrace1);
		dl.append(dt, ...dds, childNodes, rbrace2);
		return dl;
	};
	let timer: number;
	textbox.addEventListener('input', e => {
		if (!(e as InputEvent).isComposing) {
			clearTimeout(timer);
			timer = window.setTimeout((async () => {
				const astDom = createAST(await wikiparse.json(textbox.value, printer.include, qid));
				astDom.children[0]!.classList.remove('inactive');
				astContainer.innerHTML = '';
				astContainer.append(astDom);
			}) as () => void, 2000);
		}
	});
	astContainer.addEventListener('click', ({target}) => {
		(target as HTMLElement).closest('dt')?.classList.toggle('inactive');
	});

	// 鼠标悬停AST节点时，高亮对应的文本
	const nodeMap = new WeakMap<HTMLDListElement, HTMLElement | undefined>();
	let curNode: HTMLElement | undefined,
		curDl: HTMLDListElement | null;

	/**
	 * 更新hover状态
	 * @param curNode 旧的hover节点
	 * @param nextNode 新的hover节点
	 */
	const updateHover = (nextNode: HTMLElement | undefined): void => {
		if (curNode !== nextNode) {
			curNode?.classList.remove('hover');
			nextNode?.classList.add('hover');
			curNode = nextNode;
		}
	};

	/**
	 * 根据字符位置区间查找对应的DOM节点
	 * @param start 字符位置起点
	 * @param end 字符位置终点
	 */
	const findNode = (start: number, end: number): HTMLElement | undefined => {
		/* eslint-disable no-param-reassign */
		if (start === end) {
			return undefined;
		}
		let cur = document.getElementById('wikiPretty')!.firstChild;
		while (cur) {
			const {length} = cur.textContent!;
			if (start >= length) {
				cur = cur.nextSibling;
				start -= length;
				end -= length;
			} else if (end > length || cur.nodeType === Node.TEXT_NODE) {
				return undefined;
			} else if (start === 0 && end === length) {
				return cur as HTMLElement;
			} else {
				cur = cur.firstChild;
			}
		}
		return undefined;
		/* eslint-enable no-param-reassign */
	};
	astContainer.addEventListener('mouseover', ({target}) => {
		const dl = (target as HTMLElement).closest('dl');
		if (dl !== curDl) {
			curDl?.classList.remove('hover');
			dl?.classList.add('hover');
			curDl = dl;
		}
		if (!dl) {
			updateHover(undefined);
			return;
		}
		let nextNode = nodeMap.get(dl);
		if (nextNode?.isConnected) {
			updateHover(nextNode);
			return;
		}
		const start = Number(dl.dataset['start']),
			end = Number(dl.dataset['end']);
		nextNode = findNode(start, end);
		nodeMap.set(dl, nextNode);
		updateHover(nextNode);
	});

	/**
	 * 切换tab
	 * @param e 事件
	 */
	const switchTab = function(this: HTMLButtonElement, e: MouseEvent): void {
		e.preventDefault();
		const active = document.querySelector<HTMLButtonElement>('.active')!,
			{value} = this;
		if (active === this) {
			return;
		}
		active.classList.remove('active');
		this.classList.add('active');
		h2.textContent = `Please input wikitext into the text box ${
			value === 'highlighter' ? 'under the first tab' : 'below'
		}.`;
		for (const tabcontent of tabcontents) {
			tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
		}
		const text1 = textbox.value,
			text2 = instance.view.state.doc.toString();
		switch (active.value) {
			case 'linter':
				// 离开linter时，将linter的文本同步到editor
				if (text1 !== text2) {
					updateDoc(text2);
				}
			// no default
		}
		switch (value) {
			case 'linter':
				// 进入linter时，将editor的文本同步到linter
				if (text1 !== text2) {
					instance.view.dispatch({changes: {from: 0, to: text2.length, insert: text1}});
					instance.update();
				}
				break;
			case 'highlighter':
				// 进入highlighter时，将editor的文本同步到highlighter
				if (pres[0].childElementCount && pres[0].innerText === textbox.value.trimEnd()) {
					break;
				}
				(async () => {
					for (const [i, pre] of pres.entries()) {
						pre.classList.remove('wikiparser');
						pre.textContent = textbox.value;
						await wikiparse.highlight!(pre, Boolean(i), true); // eslint-disable-line no-await-in-loop
					}
				})();
			// no default
		}
		history.replaceState(null, '', `#${value}`);
	};
	for (const button of buttons.slice(0, -1)) {
		button.addEventListener('click', switchTab);
	}

	/** hashchange事件处理 */
	const hashchange = (): void => {
		buttons.find(({value}) => value === location.hash.slice(1))?.click();
	};
	hashchange();
	window.addEventListener('hashchange', hashchange);

	Object.assign(window, {cm: instance});
})();
