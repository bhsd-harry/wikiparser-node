'use strict';

(() => {
	/** web worker */
	const workerJS = () => {
		self.importScripts('https://bhsd-harry.github.io/wikiparser-node/bundle/bundle.min.js');
		const /** @type {{Parser: Parser}} */ {Parser} = self;
		self.onmessage = /** @param {{data: ParserConfig|[number, string, Boolean]}} */ ({data}) => {
			if (Array.isArray(data)) {
				const [id, ...args] = data;
				self.postMessage([id, Parser.parse(...args).print()]);
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
	 * @param {number} id Printer编号
	 * @returns {Promise<string>}
	 */
	const parse = (wikitext, include, id = -1) => new Promise(resolve => {
		/**
		 * 临时的listener
		 * @param {{data: [number, string]}} e 事件
		 */
		const listener = ({data: [rid, parsed]}) => {
			if (id === rid) {
				worker.removeEventListener('message', listener);
				resolve(parsed);
			}
		};
		worker.addEventListener('message', listener);
		worker.postMessage([id, wikitext, include]);
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
			/** @type {Promise<void>} */ this.running = undefined;
			this.ticks = 0;
		}

		/** 倒计时 */
		tick() {
			setTimeout(() => {
				if (this.ticks > 0) {
					this.ticks -= 1000;
					if (this.ticks <= 0) {
						this.coarsePrint();
					} else {
						this.tick();
					}
				}
			}, 1000);
		}

		/**
		 * 用于debounce
		 * @param {number} delay 延迟
		 */
		queue(delay) {
			const {ticks} = this;
			this.ticks = delay;
			if (ticks <= 0) {
				this.tick();
			}
		}

		/**
		 * 渲染
		 * @param {string} printed 渲染后的HTML
		 */
		paint(printed) {
			this.preview.innerHTML = printed;
		}

		/**
		 * 解析
		 * @returns {Promise<void>}
		 */
		async coarsePrint() {
			this.textbox.value = this.preview.innerText || '';
			if (this.running) {
				return undefined;
			}
			const {option: {include}, textbox: {value}} = this,
				printed = await parse(value, include, this.id);
			if (this.option.include !== include || this.preview.innerText !== value) {
				this.running = undefined;
				return this.coarsePrint();
			}
			this.paint(printed);
			this.running = undefined;
			return undefined;
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
		preview.classList.add('wikiparser');
		preview.setAttribute('contenteditable', true);
		preview.textContent = textbox.value;
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);

		/** 更新高亮 */
		const update = () => {
			printer.queue(2000);
		};

		preview.addEventListener('input', update);
		preview.addEventListener('cut', update);
		preview.addEventListener('keydown', e => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				printer.ticks = 0;
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
