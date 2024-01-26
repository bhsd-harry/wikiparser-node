import {CodeMirror6} from '/codemirror-mediawiki/dist/main.min.js';
import type {Config} from '../base';
import type {MwConfig, CodeMirror, AST} from './typings';

/**
 * Kebab case to Pascal case
 * @param type AST节点类型
 */
const transform = (type?: string): string | undefined =>
	type && type.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');

/**
 * Object.fromEntries polyfill
 * @param entries
 * @param target
 */
const fromEntries = (entries: readonly string[], target: Record<string, unknown>): void => {
	for (const entry of entries) {
		target[entry] = true;
	}
};

/**
 * 将wikiparser-node设置转换为codemirror-mediawiki设置
 * @param config
 */
export const getMwConfig = (config: Config): MwConfig => {
	const mwConfig: MwConfig = {
		tags: {},
		tagModes: {
			ref: 'text/mediawiki',
		},
		doubleUnderscore: [{}, {}],
		functionSynonyms: [config.parserFunction[0], {}],
		urlProtocols: `${config.protocol}|//`,
		nsid: config.nsid,
	};
	fromEntries(config.ext, mwConfig.tags);
	fromEntries(config.doubleUnderscore[0].map(s => `__${s}__`), mwConfig.doubleUnderscore[0]);
	fromEntries(config.doubleUnderscore[1].map(s => `__${s}__`), mwConfig.doubleUnderscore[1]);
	fromEntries((config.parserFunction.slice(2) as string[][]).flat(), mwConfig.functionSynonyms[0]);
	fromEntries(config.parserFunction[1], mwConfig.functionSynonyms[1]);
	return mwConfig;
};

(async () => {
	if (!location.pathname.startsWith('/wikiparser-node')) {
		return;
	}

	// DOM元素
	const textbox = document.querySelector<HTMLTextAreaElement>('#wpTextbox1')!,
		textbox2 = document.querySelector<HTMLTextAreaElement>('#wpTextbox2')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		input2 = document.querySelector<HTMLInputElement>('#wpHighlight')!,
		h2 = document.querySelector<HTMLHeadingElement>('h2')!,
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
	const instance = new (CodeMirror6 as unknown as typeof CodeMirror)(textbox2),
		mwConfig = getMwConfig(config);
	instance.prefer([
		'highlightSpecialChars',
		'highlightWhitespace',
		'highlightTrailingWhitespace',
		'bracketMatching',
		'closeBrackets',
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
		const entries = Object.entries(ast).filter(([key]) => key !== 'type' && key !== 'childNodes'),
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

	/**
	 * 切换tab
	 * @param e 事件
	 */
	const switchTab = (e: MouseEvent): void => {
		e.preventDefault();
		const active = document.querySelector<HTMLButtonElement>('.active')!,
			activeValue = active.value,
			{currentTarget} = e as MouseEvent & {currentTarget: HTMLButtonElement},
			{value} = currentTarget;
		if (active === currentTarget) {
			return;
		}
		active.classList.remove('active');
		currentTarget.classList.add('active');
		h2.textContent = `Please input wikitext into the text box ${
			value === 'highlighter' ? 'under the first tab' : 'below'
		}.`;
		for (const tabcontent of tabcontents) {
			tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
		}
		const text1 = textbox.value,
			text2 = instance.view.state.doc.toString();
		switch (activeValue) {
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
