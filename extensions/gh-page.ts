import {CodeMirror6} from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.12/dist/main.min.js';
import type {Config} from '../base';
import type {wikiparse, MwConfig, CodeMirror6 as CodeMirror} from './typings';

(async () => {
	const textbox = document.querySelector<HTMLTextAreaElement>('#wpTextbox1')!,
		textbox2 = document.querySelector<HTMLTextAreaElement>('#wpTextbox2')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		input2 = document.querySelector<HTMLInputElement>('#wpHighlight')!,
		buttons = document.getElementsByTagName('button'),
		tabcontents = document.querySelectorAll<HTMLDivElement>('.tabcontent'),
		{wikiparse} = window as unknown as {wikiparse: wikiparse},
		config: Config = await (await fetch('/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked),
		Linter = new wikiparse.Linter!(input.checked),
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

	const mwConfig: MwConfig = {
		tags: {},
		tagModes: {
			pre: 'mw-tag-pre',
			nowiki: 'mw-tag-nowiki',
			ref: 'text/mediawiki',
			references: 'text/mediawiki',
		},
		doubleUnderscore: [{}, {}],
		functionSynonyms: [config.parserFunction[0], {}],
		urlProtocols: `${config.protocol}|//`,
	};

	/**
	 * Object.fromEntries polyfill
	 * @param entries
	 * @param target
	 */
	const fromEntries = (entries: string[], target: Record<string, string>): void => {
		for (const entry of entries) {
			target[entry] = entry;
		}
	};
	fromEntries(config.ext, mwConfig.tags as unknown as Record<string, string>);
	fromEntries(config.doubleUnderscore[0], mwConfig.doubleUnderscore[0]);
	fromEntries(config.doubleUnderscore[1], mwConfig.doubleUnderscore[1]);
	fromEntries((config.parserFunction.slice(2) as string[][]).flat(), mwConfig.functionSynonyms[0]);
	fromEntries(config.parserFunction[1], mwConfig.functionSynonyms[1]);

	input2.addEventListener('change', () => {
		instance.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
		instance.lint((str: string) => Linter.codemirror(str));
	});
	input2.dispatchEvent(new Event('change'));

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
