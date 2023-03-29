'use strict';

(async () => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.querySelector('#wpTextbox'),
		/** @type {HTMLInputElement} */ input = document.querySelector('#wpInclude'),
		/** @type {{wikiparse: import('../typings/extension')}} */ {wikiparse} = window,
		config = await (await fetch('https://bhsd-harry.github.io/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	const printer = wikiparse.edit(textbox, input.checked);
	input.addEventListener('change', () => {
		printer.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});
})();
