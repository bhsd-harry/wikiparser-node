'use strict';

(() => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.getElementById('wpTextbox'),
		/** @type {HTMLInputElement} */ input = document.getElementById('wpInclude'),
		option = {include: input.checked},
		/** @type {{wikiparse: (textbox: HTMLTextAreaElement, option?: {include: boolean}) => void}} */
		{wikiparse} = window;
	wikiparse(textbox, option);
	input.addEventListener('change', () => {
		option.include = input.checked;
		textbox.dispatchEvent(new Event('input'));
	});
})();
