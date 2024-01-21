import {CodeMirror6} from '/codemirror-mediawiki/dist/main.min.js';
import type {Config} from '../base';
import type {MwConfig, CodeMirror, AST} from './typings';

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

	const textbox = document.querySelector<HTMLTextAreaElement>('#wpTextbox1')!,
		textbox2 = document.querySelector<HTMLTextAreaElement>('#wpTextbox2')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		input2 = document.querySelector<HTMLInputElement>('#wpHighlight')!,
		buttons = document.getElementsByTagName('button'),
		tabcontents = document.querySelectorAll<HTMLDivElement>('.tabcontent'),
		astContainer = document.querySelector<HTMLDivElement>('#ast')!,
		config: Config = await (await fetch('./config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked),
		Linter = new wikiparse.Linter!(input.checked),
		qid = wikiparse.id++,
		instance = new (CodeMirror6 as unknown as typeof CodeMirror)(textbox2);
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
	const update = (str?: string): void => {
		if (str) {
			textbox.value = str;
		}
		textbox.dispatchEvent(new Event('input'));
	};

	input.addEventListener('change', () => {
		printer.include = input.checked;
		Linter.include = input.checked;
		update();
		instance.update();
	});

	const mwConfig = getMwConfig(config);
	input2.addEventListener('change', () => {
		instance.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
		instance.lint((doc: unknown) => Linter.codemirror(String(doc)));
	});
	input2.dispatchEvent(new Event('change'));

	/**
	 * Kebab case to Pascal case
	 * @param type AST节点类型
	 */
	const transform = (type?: string): string | undefined =>
		type && type.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');

	/**
	 * 创建AST的HTML表示
	 * @param ast AST
	 */
	const createAST = (ast: AST): HTMLDListElement => {
		const dl = document.createElement('dl'),
			dt = document.createElement('dt'),
			childNodes = document.createElement('dd');
		dt.textContent = transform(ast.type) ?? 'Text';
		childNodes.textContent = 'childNodes: Array';
		if ('childNodes' in ast) {
			childNodes.append(...ast.childNodes.map(createAST));
		} else {
			childNodes.style.display = 'none';
		}
		dl.append(dt, childNodes, ...Object.entries(ast).flatMap(([key, value]) => {
			if (key === 'type' || key === 'childNodes') {
				return [];
			}
			const dd = document.createElement('dd');
			dd.textContent = `${key}: ${value}`;
			return dd;
		}));
		return dl;
	};

	let timer: number;
	textbox.addEventListener('input', e => {
		if (!(e as InputEvent).isComposing) {
			clearTimeout(timer);
			timer = window.setTimeout((async () => {
				astContainer.innerHTML = '';
				astContainer.append(createAST(await wikiparse.json(textbox.value, printer.include, qid)));
			}) as () => void, 2000);
		}
	});

	/**
	 * 切换 tab
	 * @param e 事件
	 */
	const handler = (e: MouseEvent): void => {
		e.preventDefault();
		const active = document.querySelector('.active')!,
			{currentTarget} = e as MouseEvent & {currentTarget: HTMLButtonElement},
			{value} = currentTarget;
		if (active === currentTarget) {
			return;
		}
		active.classList.remove('active');
		currentTarget.classList.add('active');
		if (value === 'editor') {
			update(instance.view.state.doc.toString());
		} else {
			instance.view.dispatch({changes: {from: 0, to: instance.view.state.doc.length, insert: textbox.value}});
			instance.update();
		}
		for (const tabcontent of tabcontents) {
			tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
		}
		history.replaceState(null, '', `#${value}`);
	};
	for (const button of buttons) {
		if (button.value) {
			button.addEventListener('click', handler);
		}
	}

	if (location.hash === '#editor') {
		buttons[0]!.click();
	}
	window.addEventListener('hashchange', () => {
		switch (location.hash) {
			case '#editor':
				buttons[0]!.click();
				break;
			case '#linter':
				buttons[1]!.click();
			// no default
		}
	});

	Object.assign(window, {cm: instance});
})();
