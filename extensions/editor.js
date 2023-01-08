'use strict';

(() => {
	/**
	 * 高亮textarea
	 * @param {HTMLTextAreaElement} textbox textarea元素
	 * @param {{include: boolean}} option 解析选项
	 * @throws `TypeError` 不是textarea
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
		preview.classList.add('wikiparser', 'active');
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);
		const /** @type {{Parser: Parser}} */ {Parser} = window;
		let debouncedUpdate = 0,
			debouncedScroll = 0,
			updateId = 0,
			scrollId = 0,
			root = Parser.parse('', false, 0);

		/** 绘制 */
		const paint = () => {
				preview.innerHTML = `${root.print()} `;
				preview.scrollTop = textbox.scrollTop;
			},

			/**
			 * 处理scroll事件
			 * @param {number} id 记录scroll事件id
			 */
			viewport = id => {
				const {offsetHeight: parentHeight, scrollTop} = preview,
					{children: [rootNode]} = preview,
					/** @type {HTMLElement[]} */ childNodes = [...rootNode.childNodes];
				let start = childNodes.findIndex(
						({nodeType, offsetTop, offsetHeight}) => nodeType !== 3 && offsetTop + offsetHeight > scrollTop,
					),
					end = childNodes.slice(start + 1).findIndex(
						({nodeType, offsetTop}) => nodeType !== 3 && offsetTop >= scrollTop + parentHeight,
					);
				end = end === -1 ? childNodes.length : end + start + 1;
				start &&= start - 1;
				const wikitext = root.childNodes.slice(start, end).map(String).join(''),
					{childNodes: tokens} = Parser.parse(wikitext, option.include);
				// 一段时间后
				if (scrollId === id) {
					for (let i = end - 1; i >= start; i--) {
						root.removeAt(i);
					}
					for (let i = tokens.length - 1; i >= 0; i--) {
						root.insertAt(tokens[i], start);
					}
					paint();
				}
			},

			/**
			 * 开始高亮
			 * @param {number} id 记录重新高亮id
			 * @throws `Error` 解析出错
			 */
			prettify = id => {
				let token = Parser.parse(textbox.value, option.include, 2);
				if (String(token) !== textbox.value) {
					alert('解析出错！请复制导致错误的文本，提交到GitHub issues。');
					throw new Error('解析出错！');
				}
				// 一段时间后
				if (updateId === id) {
					root = token;
					paint();
					preview.classList.remove('active');
					textbox.style.color = 'transparent';
					if (preview.scrollHeight > preview.offsetHeight) {
						preview.scrollTop = textbox.scrollTop;
						viewport(++scrollId);
					} else {
						token = Parser.parse(textbox.value, option.include);
						// 一段时间后
						if (updateId === id) {
							root = token;
							paint();
						}
					}
				}
			},

			/** 更新高亮 */
			update = () => {
				clearTimeout(debouncedUpdate);
				clearTimeout(debouncedScroll);
				scrollId++;
				debouncedUpdate = setTimeout(prettify, 2000, ++updateId);
				textbox.style.color = '';
				preview.classList.add('active');
			};
		textbox.addEventListener('input', update);
		textbox.addEventListener('cut', update);
		textbox.addEventListener('scroll', () => {
			if (preview.scrollHeight > preview.offsetHeight && !preview.classList.contains('active')) {
				preview.scrollTop = textbox.scrollTop;
				clearTimeout(debouncedScroll);
				debouncedScroll = setTimeout(viewport, 500, ++scrollId);
			}
		});
		prettify(updateId);
	};
	window.wikiparse = wikiparse;
})();
