'use strict';
(() => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.getElementById('wpTextbox'),
		preview = document.getElementById('wikiPretty'),
		/** @type {HTMLInputElement} */ input = document.getElementById('wpInclude'),
		/** @type {{Parser: Parser}} */ {Parser} = window;
	let /** @type {number} */ debounced;
	const prettify = () => {
			clearTimeout(debounced);
			const wikitext = textbox.value,
				printed = Parser.print(wikitext, input.checked);
			preview.innerHTML = printed;
		},
		debounce = () => {
			clearTimeout(debounced);
			debounced = setTimeout(prettify, 2500);
		};
	textbox.addEventListener('input', debounce);
	input.addEventListener('change', prettify);
	prettify();
})();
