'use strict';

(() => {
	/**
	 * @param {HTMLTextAreaElement} textbox
	 * @param {{include: boolean}} option
	 */
	const wikiparse = (textbox, option = {}) => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse方法仅可用于textarea元素！');
		} else if (typeof option !== 'object') {
			option = {include: option};
		}
		const preview = document.createElement('div'),
			container = document.createElement('div');
		preview.id = 'wikiPretty';
		preview.classList.add('wikiparser');
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);
		const /** @type {{Parser: Parser}} */ {Parser} = window;
		let /** @type {number} */ debouncedUpdate,
			/** @type {number} */ debouncedScroll,
			root = Parser.parse(textbox.value, option.include, 0);
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
				end = end === -1 ? childNodes.length : end + start + 1;
				start &&= start - 1;
				const wikitext = root.childNodes.slice(start, end).map(String).join(''),
					tokens = Parser.parse(wikitext, option.include).childNodes;
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
				root = Parser.parse(textbox.value, option.include, 2);
				paint();
				preview.classList.remove('active');
				textbox.style.color = 'transparent';
				if (preview.scrollHeight > preview.offsetHeight) {
					viewport();
				} else {
					root = Parser.parse(textbox.value, option.include);
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
		prettify();
	};
	window.wikiparse = wikiparse;
})();
