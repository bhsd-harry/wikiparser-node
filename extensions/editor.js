'use strict';

(() => {
	/** web worker */
	const workerJS = () => {
		self.importScripts('https://bhsd-harry.github.io/wikiparser-node/bundle/bundle.min.js');
		const /** @type {{Parser: Parser}} */ {Parser} = self,
			entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
		self.onmessage = /** @param {{data: ParserConfig|[number, string, Boolean, number]}} */ ({data}) => {
			if (Array.isArray(data)) {
				const [id, ...args] = data,
					{childNodes} = Parser.parse(...args);
				self.postMessage([
					id,
					childNodes.map(String),
					childNodes.map(child => child.type === 'text'
						? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
						: child.print()),
				]);
			} else {
				Parser.config = data;
			}
		};
	};

	const blob = new Blob([`(${String(workerJS)})()`], {type: 'text/javascript'}),
		url = URL.createObjectURL(blob),
		worker = new Worker(url);
	URL.revokeObjectURL(url);

	/**
	 * 将解析改为异步执行
	 * @param {string} wikitext wikitext
	 * @param {boolean} include 是否嵌入
	 * @param {number} stage 解析层级
	 * @param {number} id Printer编号
	 * @returns {Promise<string[][]>}
	 */
	const parse = (wikitext, include, stage, id = -1) => new Promise(resolve => {
		/**
		 * 临时的listener
		 * @param {{data: [number, string[], string[]]}} e 事件
		 */
		const listener = ({data: [rid, ...parsed]}) => {
			if (id === rid) {
				worker.removeEventListener('message', listener);
				resolve(parsed);
			}
		};
		worker.addEventListener('message', listener);
		worker.postMessage([id, wikitext, include, stage]);
	});

	let id = 0;

	/** 用于打印AST */
	class Printer {
		/**
		 * @param {HTMLDivElement} preview 置于下层的代码高亮
		 * @param {HTMLTextAreaElement} textbox 置于上层的文本框
		 * @param {{include: boolean}} option 是否嵌入
		 */
		constructor(preview, textbox, option) {
			this.id = id++;
			this.preview = preview;
			this.textbox = textbox;
			this.option = option;
			/** @type {string[][]} */ this.root = [];
			/** @type {Promise<void>} */ this.running = undefined;
			this.viewportChanged = false;
			/** @type {[number, string]} */ this.ticks = [0, undefined];
		}

		/** 倒计时 */
		tick() {
			setTimeout(() => {
				const {ticks} = this;
				if (ticks[0] > 0) {
					ticks[0] -= 500;
					if (ticks[0] <= 0) {
						this[ticks[1]]();
					} else {
						this.tick();
					}
				}
			}, 500);
		}

		/**
		 * 用于debounce
		 * @param {number} delay 延迟
		 * @param {string} method 方法
		 */
		queue(delay, method) {
			const {ticks} = this,
				[state] = ticks;
			if (state <= 0 || method === 'coarsePrint' || ticks[1] !== 'coarsePrint') {
				ticks[0] = delay;
				ticks[1] = method;
				if (state <= 0) {
					this.tick();
				}
			}
		}

		/** 渲染 */
		paint() {
			this.preview.innerHTML = `<span class="wpb-root">${this.root[1].join('')}</span> `;
			this.preview.scrollTop = this.textbox.scrollTop;
			this.preview.classList.remove('active');
			this.textbox.style.color = 'transparent';
		}

		/** 初步解析 */
		async coarsePrint() {
			if (this.running) {
				return undefined;
			}
			const {option: {include}, textbox: {value}} = this,
				[str, printed] = await parse(value, include, 2, this.id);
			if (this.option.include !== include || this.textbox.value !== value) {
				this.running = undefined;
				this.running = this.coarsePrint();
				return this.running;
			}
			this.root = [str, printed];
			this.paint();
			this.running = undefined;
			this.running = this.finePrint();
			return this.running;
		}

		/** 根据可见范围精细解析 */
		async finePrint() {
			if (this.running) {
				this.viewportChanged = true;
				return undefined;
			}
			this.viewportChanged = false;
			const {
				root: [oldStr, oldPrinted],
				preview: {scrollHeight, offsetHeight: parentHeight, scrollTop, children: [rootNode]},
				option: {include},
				textbox: {value},
			} = this;
			let text = value,
				start = 0,
				{length: end} = oldStr;
			if (scrollHeight > parentHeight) {
				const /** @type {HTMLElement[]} */ childNodes = [...rootNode.childNodes],
					headings = childNodes.filter(({className}) => className === 'wpb-heading');
				if (headings.length > 0) {
					const i = headings.findIndex(({offsetTop, offsetHeight}) => offsetTop + offsetHeight > scrollTop),
						j = i === -1
							? -1
							: headings.slice(i).findIndex(({offsetTop}) => offsetTop >= scrollTop + parentHeight);
					if (i === -1) {
						start = childNodes.indexOf(headings[headings.length - 1]);
					} else if (i > 0) {
						start = childNodes.indexOf(headings[i - 1]);
					}
					if (j >= 0) {
						end = childNodes.indexOf(headings[i + j]);
					}
					text = oldStr.slice(start, end).join('');
				}
			}
			const [str, printed] = await parse(text, include, undefined, this.id);
			if (this.option.include === include && this.textbox.value === value) {
				this.root = [
					[...oldStr.slice(0, start), ...str, ...oldStr.slice(end)],
					[...oldPrinted.slice(0, start), ...printed, ...oldPrinted.slice(end)],
				];
				this.paint();
				this.running = undefined;
				if (this.viewportChanged) {
					this.running = this.finePrint();
				}
			} else {
				this.running = undefined;
				this.running = this.coarsePrint();
			}
			return this.running;
		}
	}

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
			container = document.createElement('div'),
			printer = new Printer(preview, textbox, option);
		preview.id = 'wikiPretty';
		preview.classList.add('wikiparser', 'active');
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);

		/** 更新高亮 */
		const update = () => {
			printer.queue(2000, 'coarsePrint');
			textbox.style.color = '';
			preview.classList.add('active');
		};

		textbox.addEventListener('input', update);
		textbox.addEventListener('cut', update);
		textbox.addEventListener('scroll', () => {
			if (preview.scrollHeight > preview.offsetHeight && !preview.classList.contains('active')) {
				preview.scrollTop = textbox.scrollTop;
				printer.queue(500, 'finePrint');
			}
		});
		textbox.addEventListener('keydown', e => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				printer.ticks[0] = 0;
				printer.running = printer.coarsePrint();
			}
		});
		printer.running = printer.coarsePrint();
		return printer;
	};

	/**
	 * 更新解析设置
	 * @param {ParserConfig} config 设置
	 */
	const setConfig = config => {
		worker.postMessage(config);
	};

	wikiparse.parse = parse;
	wikiparse.setConfig = setConfig;
	window.wikiparse = wikiparse;
})();
