import {CodeMirror6} from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.5/dist/main.min.js';
import type {Config} from '../base';
import type {wikiparse, EditorView} from './typings';

(async () => {
	// 第一个文本框
	const textbox: HTMLTextAreaElement = document.querySelector('#wpTextbox1')!,
		input: HTMLInputElement = document.querySelector('#wpInclude1')!,
		{wikiparse} = window as unknown as {wikiparse: wikiparse},
		config: Config = await (await fetch('/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked);
	input.addEventListener('change', () => {
		printer.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});

	// 第二个文本框
	const textbox2: HTMLTextAreaElement = document.querySelector('#wpTextbox2')!,
		input2: HTMLInputElement = document.querySelector('#wpInclude2')!,
		instance = new CodeMirror6(textbox2),
		Linter = new wikiparse.Linter!(input2.checked);
	instance.lint((view: EditorView) => Linter.codemirror(view.state.doc.toString()));
	input.addEventListener('change', () => {
		Linter.include = input.checked;
		// instance.view.dispatch({docChanged: true});
	});
})();
