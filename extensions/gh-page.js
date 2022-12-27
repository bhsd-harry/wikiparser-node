'use strict';
(() => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.getElementById('wpTextbox'),
		preview = document.getElementById('wikiPretty'),
		/** @type {HTMLInputElement} */ input = document.getElementById('wpInclude'),
		/** @type {{Parser: Parser}} */ {Parser} = window;
	let /** @type {number} */ debounced;
	const prettify = () => {
			clearTimeout(debounced);
			preview.innerHTML = Parser.print(textbox.value, input.checked);
			preview.classList.remove('active');
			textbox.style.color = 'transparent';
			preview.scrollTop = textbox.scrollTop;
		},
		debounce = () => {
			clearTimeout(debounced);
			debounced = setTimeout(prettify, 1000);
			textbox.style.color = '';
			preview.classList.add('active');
		};
	textbox.addEventListener('input', debounce);
	textbox.addEventListener('cut', debounce);
	textbox.addEventListener('scroll', () => {
		preview.scrollTop = textbox.scrollTop;
	});
	input.addEventListener('change', prettify);
	prettify();
})();
