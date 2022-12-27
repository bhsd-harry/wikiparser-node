'use strict';

(() => {
	const /** @type {HTMLTextAreaElement} */ textbox = document.getElementById('wpTextbox'),
		preview = document.getElementById('wikiPretty'),
		/** @type {HTMLInputElement} */ input = document.getElementById('wpInclude'),
		/** @type {{Parser: Parser}} */ {Parser} = window;
	let /** @type {number} */ debouncedUpdate,
		/** @type {number} */ debouncedScroll,
		root = Parser.parse(textbox.value, input.checked, 0);
	const paint = () => {
			preview.innerHTML = `${root.print()} `;
			preview.scrollTop = textbox.scrollTop;
		},
		viewport = () => {
			const {offsetHeight: parentHeight, scrollTop} = preview,
				[rootNode] = preview.children,
				/** @type {HTMLElement[]} */ childNodes = [...rootNode.childNodes];
			let start = childNodes.findIndex(child => {
					if (child.nodeType === 3) {
						return false;
					}
					const {offsetTop, offsetHeight} = child;
					return offsetTop < scrollTop + parentHeight && offsetTop + offsetHeight > scrollTop;
				}),
				end = childNodes.slice(start + 1).findIndex(child => {
					if (child.nodeType === 3) {
						return false;
					}
					const {offsetTop, offsetHeight} = child;
					return offsetTop >= scrollTop + parentHeight || offsetTop + offsetHeight <= scrollTop;
				});
			end += end === -1 ? Infinity : start + 1;
			start &&= start - 1;
			const wikitext = root.childNodes.slice(start, end).map(String).join(''),
				tokens = Parser.parse(wikitext, input.checked).childNodes;
			for (let i = end - 1; i >= start; i--) {
				root.removeAt(i);
			}
			for (let i = tokens.length - 1; i >= 0; i--) {
				root.insertAt(tokens[i], start);
			}
			paint();
		},
		prettify = () => {
			clearTimeout(debouncedUpdate);
			clearTimeout(debouncedScroll);
			root = Parser.parse(textbox.value, input.checked, 2);
			paint();
			preview.classList.remove('active');
			textbox.style.color = 'transparent';
			if (preview.scrollHeight > preview.offsetHeight) {
				viewport();
			} else {
				root = Parser.parse(textbox.vallue, input.checked);
				paint();
			}
		},
		update = () => {
			clearTimeout(debouncedUpdate);
			clearTimeout(debouncedScroll);
			debouncedUpdate = setTimeout(prettify, 1000);
			textbox.style.color = '';
			preview.classList.add('active');
		};
	textbox.addEventListener('input', update);
	textbox.addEventListener('cut', update);
	textbox.addEventListener('scroll', () => {
		preview.scrollTop = textbox.scrollTop;
		if (preview.scrollHeight > preview.offsetHeight) {
			clearTimeout(debouncedScroll);
			debouncedScroll = setTimeout(viewport, 1000);
		}
	});
	input.addEventListener('change', prettify);
	prettify();
})();
