'use strict';

(() => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.querySelector('#wpTextbox'),
		/** @type {HTMLInputElement} */ input = document.querySelector('#wpInclude'),
		option = {include: input.checked},
		/** @type {{wikiparse: (textbox: HTMLTextAreaElement, option?: {include: boolean}) => void, Parser: Parser}} */
		{wikiparse} = window;
	wikiparse(textbox, option);
	input.addEventListener('change', () => {
		option.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});
})();
