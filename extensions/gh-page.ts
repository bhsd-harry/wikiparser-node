import {CodeMirror6} from '/codemirror-mediawiki/dist/demo.min.js';
import {CodeJar} from '/codejar-async/dist/codejar.js';
import Renderer from '/wikiparser-node/bundle/bundle-html.min.js';
import type {ConfigData, AST} from './typings';

declare global {
	const monaco: PromiseLike<{editor: MonacoEditor}>;
}

/**
 * Kebab case to Pascal case
 * @param type AST节点类型
 */
const transform = (type?: string): string | undefined =>
	type && type.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');

const keys = new Set(['type', 'childNodes', 'range']),
	noInput = new Set(['highlighter', 'renderer']);

(async () => {
	Object.assign(globalThis, {CodeJar});
	await import('/wikiparser-node/extensions/dist/codejar.js');

	// DOM元素
	const textbox = document.querySelector<HTMLTextAreaElement>('#wpTextbox1')!,
		textbox2 = document.querySelector<HTMLTextAreaElement>('#wpTextbox2')!,
		monacoContainer = document.getElementById('monaco-container')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		field = input.closest<HTMLDivElement>('.fieldLayout')!,
		input2 = document.querySelector<HTMLInputElement>('#wpHighlight')!,
		api = document.querySelector<HTMLInputElement>('#wpAPI')!,
		fetchBtn = document.querySelector<HTMLButtonElement>('#wpFetch')!,
		h2 = document.querySelector('h2')!,
		buttons = [...document.querySelectorAll('.tab > button')] as HTMLButtonElement[],
		tabcontents = document.querySelectorAll<HTMLDivElement>('.tabcontent'),
		astContainer = document.getElementById('ast')!,
		highlighters = document.getElementById('highlighter')!.children as HTMLCollectionOf<HTMLDivElement>,
		pres = [...document.getElementsByClassName('highlight')] as [HTMLPreElement, HTMLPreElement],
		frame = document.querySelector<HTMLDivElement>('.frame')!;

	/**
	 * 同步解析设置
	 * @param config 解析设置
	 */
	const syncConfig = (config: ConfigData): void => {
		Parser.config = config;
		Renderer.config = config;
		wikiparse.setConfig(config);
	};

	// Parser初始化
	const config: ConfigData = await (await fetch('./config/default.json')).json();
	Parser.internal = true;
	syncConfig(config);

	/**
	 * 不通过worker立即执行print方法
	 * @param wikitext wikitext
	 * @param include 是否嵌入
	 * @param stage 解析层级
	 */
	const immediatePrint = (wikitext: string, include?: boolean, stage?: number): Promise<[number, string, string][]> =>
		Promise.resolve(
			Parser.parse(wikitext, include, stage).childNodes
				.map(child => [stage ?? Infinity, String(child), child.print()]),
		);
	const jar = (await wikiparse.codejar!)(textbox, input.checked, true),
		Linter = new wikiparse.Linter!(input.checked),
		{print} = wikiparse,
		qid = wikiparse.id++;
	highlighters[1 - Number(input.checked)]!.style.display = 'none';

	// CodeMirror初始化
	const cm = new CodeMirror6(textbox2),
		mwConfig = CodeMirror6.getMwConfig(config);

	// Monaco初始化
	const model = (await monaco).editor.createModel(textbox2.value, 'wikitext');
	(await monaco).editor.create(monacoContainer, {
		model,
		automaticLayout: true,
		theme: 'monokai',
		wordWrap: 'on',
		wordBreak: 'keepAll',
		renderValidationDecorations: 'on',
		glyphMargin: true,
		fontSize: parseFloat(getComputedStyle(textbox2).fontSize),
		unicodeHighlight: {
			ambiguousCharacters: false,
		},
	});
	textbox2.addEventListener('input', () => {
		model.setValue(textbox2.value);
	});

	// Renderer初始化
	frame.addEventListener('click', e => {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.matches('label[for=toctogglecheckbox]')) {
			const checkbox = target.closest('#toc')!.querySelector('input')!;
			checkbox.checked = !checkbox.checked;
		} else {
			const a = target.closest('a'),
				href = a?.getAttribute('href');
			if (href?.startsWith('#') && frame.contains(a)) {
				const ele = document.getElementById(href.slice(1));
				if (frame.contains(ele)) {
					ele!.scrollIntoView({behavior: 'smooth'});
				}
			}
		}
	}, {capture: true});

	// 切换是否嵌入
	input.addEventListener('change', () => {
		const {checked} = input;
		jar.include = checked;
		Linter.include = checked;
		jar.updateCode(jar.toString());
		cm.update();
		const i = Number(checked);
		highlighters[i]!.style.display = '';
		highlighters[1 - i]!.style.display = 'none';
	});

	// 获取MediaWiki配置
	const configMap = new Map<string, ConfigData>();

	/**
	 * 禁用/启用API按钮
	 * @param disable 是否禁用
	 * @param invalid 是否将输入框标记为无效
	 */
	const toggleApi = (disable: boolean, invalid = disable): void => {
			fetchBtn.disabled = disable;
			api.classList.toggle('invalid', invalid);
		},

		/** 根据输入的URL禁用/启用API按钮 */
		validateApi = (): string | false => {
			const value = api.value.trim();
			if (!value) {
				toggleApi(true, false);
				return false;
			}
			try {
				const url = new URL(value).href;
				if (url.endsWith('/api.php')) {
					toggleApi(false);
					return url;
				}
			} catch {}
			toggleApi(true);
			return false;
		};
	fetchBtn.addEventListener('click', () => {
		if (fetchBtn.disabled) {
			return;
		}
		const url = validateApi();
		if (!url) {
			api.focus();
			return;
		} else if (configMap.has(url)) {
			syncConfig(configMap.get(url)!);
			return;
		}
		fetchBtn.disabled = true;
		(async () => {
			try {
				// eslint-disable-next-line unicorn/prefer-structured-clone
				const configData: ConfigData = JSON.parse(JSON.stringify(
					await Parser.fetchConfig(url.slice(0, -8)),
				));
				configMap.set(url, configData);
				syncConfig(configData);
				fetchBtn.disabled = false;
			} catch (e) {
				console.error(e);
				toggleApi(true);
				api.focus();
			}
		})();
	});
	api.addEventListener('input', () => {
		validateApi();
	});

	/** 切换CodeMirror语言 */
	const setLang = (): void => {
		cm.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
		cm.lint(({doc}: {doc: unknown}) => Linter.codemirror(String(doc)));
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
				code.textContent = typeof value === 'string'
					? `"${value.replaceAll(/[\\"]/gu, String.raw`\$&`)}"`
					: String(value);
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
		if (ast.childNodes) {
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
	jar.onUpdate(code => {
		clearTimeout(timer);
		timer = window.setTimeout((async () => { // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
			const astDom = createAST(await wikiparse.json(code, jar.include, qid));
			astDom.children[0]!.classList.remove('inactive');
			astContainer.replaceChildren(astDom);
		}) as () => void, 30);
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
		let cur = document.querySelector('#editor > .wikiparser')!.firstChild;
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
	 * 更新CodeJar的内容
	 * @param oldText 旧内容
	 * @param newText 新内容
	 */
	const updateJar = (oldText: string, newText: string): void => {
		if (oldText !== newText) {
			jar.updateCode(newText);
		}
	};

	/**
	 * 更新CodeMirror的内容
	 * @param oldText 旧内容
	 * @param newText 新内容
	 */
	const updateCodeMirror = (oldText: string, newText: string): void => {
		if (oldText !== newText) {
			cm.view!.dispatch({changes: {from: 0, to: oldText.length, insert: newText}});
			cm.update();
		}
	};

	/**
	 * 更新Monaco的内容
	 * @param oldText 旧内容
	 * @param newText 新内容
	 */
	const updateMonaco = (oldText: string, newText: string): void => {
		if (oldText !== newText) {
			model.setValue(newText);
		}
	};

	/**
	 * 切换tab
	 * @param e 事件
	 */
	const switchTab = function(this: HTMLButtonElement, e: PointerEvent): void {
		e.preventDefault();
		const active = document.querySelector<HTMLButtonElement>('.active')!,
			{value} = this;
		if (active === this) {
			return;
		}
		active.classList.remove('active');
		this.classList.add('active');
		h2.textContent = `Please input wikitext into the text box ${
			noInput.has(value) ? 'under the first tab' : 'below'
		}.`;
		for (const tabcontent of tabcontents) {
			tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
		}
		const text1 = jar.toString(),
			text2 = cm.view!.state.doc.toString(),
			text3 = model.getValue();
		switch (active.value) {
			case 'editor':
				updateCodeMirror(text2, text1);
				updateMonaco(text3, text1);
				break;
			case 'linter':
				updateJar(text1, text2);
				updateMonaco(text3, text2);
				break;
			case 'lsp':
				updateJar(text1, text3);
				updateCodeMirror(text2, text3);
				// fall through
			case 'renderer':
				field.style.display = '';
				break;
			case 'highlighter':
				// 离开highlighter时，还原`wikiparser.print()`方法
				wikiparse.print = print;
			// no default
		}
		switch (value) {
			case 'renderer':
				frame.innerHTML = Renderer.toHtml(jar.toString());
				// fall through
			case 'lsp':
				field.style.display = 'none';
				break;
			case 'highlighter':
				// 进入highlighter时，将editor的文本同步到highlighter
				(async () => {
					wikiparse.print = immediatePrint;
					for (let i = 0; i < pres.length; i++) {
						const pre = pres[i]!;
						pre.classList.remove('wikiparser');
						pre.textContent = jar.toString();
						await wikiparse.highlight!(pre, Boolean(i), true);
					}
				})();
			// no default
		}
		history.replaceState(null, '', `#${value}`);
	};
	for (const button of buttons.slice(0, -1)) {
		button.addEventListener('click', switchTab);
	}

	/**
	 * hashchange事件处理
	 * @param e 事件
	 */
	const hashchange = (e?: HashChangeEvent): void => {
		buttons.find(({value}) => value === (location.hash.slice(1) || e === undefined && 'editor'))?.click();
	};
	hashchange();
	addEventListener('hashchange', hashchange);

	Object.assign(globalThis, {jar, cm, model, Renderer});
})();
