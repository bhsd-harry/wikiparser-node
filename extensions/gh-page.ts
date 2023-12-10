import type {Config} from '../base';
import type {wikiparse} from './typings';

(async () => {
	const textbox: HTMLTextAreaElement = document.querySelector('#wpTextbox')!,
		input: HTMLInputElement = document.querySelector('#wpInclude')!,
		{wikiparse} = window as unknown as {wikiparse: wikiparse},
		config: Config = await (await fetch('https://bhsd-harry.github.io/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit!(textbox, input.checked);
	input.addEventListener('change', () => {
		printer.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});
})();
