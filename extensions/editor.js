'use strict';

(() => {
	/** web worker */
	const workerJS = async () => {
		self.importScripts('https://bhsd-harry.github.io/wikiparser-node/bundle/bundle.min.js');
		const /** @type {{Parser: Parser}} */ {Parser} = self;
		Parser.config = await (await fetch('https://bhsd-harry.github.io/wikiparser-node/config/default.json')).json();
		self.postMessage('ready');
		const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
		self.onmessage = /** @param {{data: [string, Boolean, number]}} */ ({data}) => {
			const {childNodes} = Parser.parse(...data);
			self.postMessage([
				childNodes.map(String),
				childNodes.map(child => child.type === 'text'
					? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
					: child.print()),
			]);
		};
	};

	const blob = new Blob([`(${String(workerJS)})()`], {type: 'text/javascript'}),
		worker = new Worker(URL.createObjectURL(blob));

	/**
	 * 将解析改为异步执行（无实质差异）
	 * @param {string} wikitext wikitext
	 * @param {boolean} include 是否嵌入
	 * @param {number} stage 解析层级
	 * @returns {Promise<string[][]>}
	 */
	const parse = (wikitext, include, stage) => new Promise(resolve => {
		worker.onmessage = /** @param {{data: string[][]}} */ ({data}) => {
			worker.onmessage = null;
			resolve(data);
		};
		worker.postMessage([wikitext, include, stage]);
	});

	/** 用于打印AST */
	class Printer {
		/**
		 * @param {HTMLDivElement} preview 置于下层的代码高亮
		 * @param {HTMLTextAreaElement} textbox 置于上层的文本框
		 * @param {{include: boolean}} option 是否嵌入
		 */
		constructor(preview, textbox, option) {
			this.preview = preview;
			this.textbox = textbox;
			this.option = option;
			/** @type {string[][]} */ this.root = [];
			/** @type {Promise<void>} */ this.running = undefined;
			this.viewportChanged = false;
			/** @type {[number, string]} */ this.ticks = [0, undefined];
			this.tick();
		}

		/** 倒计时 */
		tick() {
			const {ticks} = this;
			if (ticks[0] > 0) {
				ticks[0] -= 1000;
				if (ticks[0] <= 0) {
					this[ticks[1]]();
				}
			}
			setTimeout(() => {
				this.tick();
			}, 1000);
		}

		/**
		 * 用于debounce
		 * @param {number} delay 延迟
		 * @param {string} method 方法
		 */
		queue(delay, method) {
			const {ticks} = this;
			if (ticks[0] <= 0 || method === 'coarsePrint' || ticks[1] !== 'coarsePrint') {
				ticks[0] = delay;
				ticks[1] = method;
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
			const [str, printed] = await parse(this.textbox.value, this.option.include, 2);
			const {textbox: {value}, root: [text]} = this;
			if (!text || text.join('') !== value) {
				if (str.join('') !== value) { // 文本改变，需重新解析
					this.running = undefined;
					this.running = this.coarsePrint();
					return this.running;
				}
				this.root = [str, printed];
			}
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
			} = this;
			let {textbox: {value}} = this,
				start = 0,
				{length: end} = oldStr;
			if (scrollHeight > parentHeight) {
				const /** @type {HTMLElement[]} */ childNodes = [...rootNode.childNodes];
				start = childNodes.findIndex(
					({nodeType, offsetTop, offsetHeight}) => nodeType !== 3 && offsetTop + offsetHeight > scrollTop,
				);
				end = childNodes.slice(start + 1).findIndex(
					({nodeType, offsetTop}) => nodeType !== 3 && offsetTop >= scrollTop + parentHeight,
				);
				end = end === -1 ? childNodes.length : end + start + 1;
				start = start && start - 1;
				value = oldStr.slice(start, end).join('');
			}
			const [str, printed] = await parse(value, this.option.include);
			const fullStr = [...oldStr.slice(0, start), ...str, ...oldStr.slice(end)];
			if (fullStr.join('') === this.textbox.value) {
				this.root = [fullStr, [...oldPrinted.slice(0, start), ...printed, ...oldPrinted.slice(end)]];
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

	let ready = false;

	/**
	 * 高亮textarea
	 * @param {HTMLTextAreaElement} textbox textarea元素
	 * @param {{include: boolean}} option 解析选项
	 * @throws `TypeError` 不是textarea
	 */
	const wikiparse = async (textbox, option = {}) => {
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

		if (!ready) {
			await new Promise(resolve => {
				worker.onmessage = /** @param {{data: string}} */ ({data}) => {
					if (data === 'ready') {
						worker.onmessage = null;
						ready = true;
						resolve();
					}
				};
			});
		}

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
				printer.coarsePrint();
			}
		});
		printer.coarsePrint();
	};

	wikiparse.parse = parse;
	window.wikiparse = wikiparse;
})();
