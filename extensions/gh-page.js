'use strict';

(async () => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.querySelector('#wpTextbox'),
		/** @type {HTMLInputElement} */ input = document.querySelector('#wpInclude'),
		option = {include: input.checked},
		/** @type {{wikiparse: wikiparse}} */ {wikiparse} = window,
		config = await (await fetch('https://bhsd-harry.github.io/wikiparser-node/config/default.json')).json();
	wikiparse.setConfig(config);
	wikiparse(textbox, option);
	input.addEventListener('change', () => {
		option.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});
})();
