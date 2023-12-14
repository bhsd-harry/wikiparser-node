import {CodeMirror6} from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.7/dist/main.min.js';
import type {Config} from '../base';
import type {wikiparse, EditorView} from './typings';

(async () => {
	const textbox: HTMLTextAreaElement = document.querySelector('#wpTextbox1')!,
		textbox2: HTMLTextAreaElement = document.querySelector('#wpTextbox2')!,
		input: HTMLInputElement = document.querySelector('#wpInclude')!,
		buttons = document.getElementsByTagName('button'),
		tabcontents = document.getElementsByClassName('tabcontent') as HTMLCollectionOf<HTMLDivElement>,
		{wikiparse} = window as unknown as {wikiparse: wikiparse},
		config: Config = await (await fetch('/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked),
		Linter = new wikiparse.Linter!(input.checked),
		instance = new CodeMirror6(textbox2);
	instance.lint((view: EditorView) => Linter.codemirror(view.state.doc.toString()));

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
})();
