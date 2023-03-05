'use strict';

(() => {
	const MAX_STAGE = 11;

	/** web worker */
	const workerJS = () => {
		self.importScripts('https://fastly.jsdelivr.net/gh/bhsd-harry/wikiparser-node@0.9.2-b/bundle/bundle.min.js');
		const /** @type {{Parser: Parser}} */ {Parser} = self,
			entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

		/**
		 * @param {{data: ['setI18N|'setConfig', ParserConfig]|[string, number, string, Boolean, number]}}
		 */
		self.onmessage = ({data}) => {
			const [command, qid, ...args] = data;
			switch (command) {
				case 'setI18N':
					Parser.i18n = qid;
					break;
				case 'setConfig':
					Parser.config = qid;
					break;
				case 'getConfig':
					self.postMessage([qid, Parser.minConfig]);
					break;
				case 'lint':
					self.postMessage([qid, Parser.parse(...args).lint(), args[0]]);
					break;
				default: {
					const stage = args[2] === undefined ? MAX_STAGE : args[2];
					self.postMessage([
						qid,
						Parser.parse(...args).childNodes.map(child => [
							stage,
							String(child),
							child.type === 'text'
								? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
								: child.print(),
						]),
					]);
				}
			}
		};
	};

	const blob = new Blob([`(${String(workerJS).replace(/MAX_STAGE/gu, MAX_STAGE)})()`], {type: 'text/javascript'}),
		url = URL.createObjectURL(blob),
		worker = new Worker(url);
	URL.revokeObjectURL(url);

	/**
	 * 生成事件监听函数
	 * @param {number} qid 输入id
	 * @param {(res: *) => void} resolve Promise对象的resolve函数
	 * @param {string} raw 原始文本
	 */
	const getListener = (qid, resolve, raw) => {
		const listener = /** @param {{data: [number, *, string]}} e 消息事件 */ ({data: [rid, res, resRaw]}) => {
			if (rid === qid && (raw === undefined || raw === resRaw)) {
				worker.removeEventListener('message', listener);
				resolve(res);
			}
		};
		return listener;
	};

	/**
	 * 更新I18N消息
	 * @param {Record<string, string>} i18n I18N消息
	 */
	const setI18N = i18n => {
		worker.postMessage(['setI18N', i18n]);
	};

	/**
	 * 更新解析设置
	 * @param {ParserConfig} config 设置
	 */
	const setConfig = config => {
		worker.postMessage(['setConfig', config]);
	};

	/**
	 * 获取Parser.minConfig
	 * @returns {Promise<ParserConfig>}
	 */
	const getConfig = () => new Promise(resolve => {
		worker.addEventListener('message', getListener(-3, resolve));
		worker.postMessage(['getConfig', -3]);
	});

	/**
	 * 将解析改为异步执行
	 * @param {string} wikitext wikitext
	 * @param {boolean} include 是否嵌入
	 * @param {number} stage 解析层级
	 * @param {number} qid Printer编号
	 * @returns {Promise<[number, string, string][]>}
	 */
	const print = (wikitext, include, stage, qid = -1) => new Promise(resolve => {
		worker.addEventListener('message', getListener(qid, resolve));
		worker.postMessage(['print', qid, wikitext, include, stage]);
	});

	/**
	 * 将语法分析改为异步执行
	 * @param {string} wikitext wikitext
	 * @param {boolean} include 是否嵌入
	 * @param {number} qid Linter编号，暂时固定为`-2`
	 * @returns {Promise<LintError[]>}
	 */
	const lint = (wikitext, include, qid = -2) => new Promise(resolve => {
		worker.addEventListener('message', getListener(qid, resolve, wikitext));
		worker.postMessage(['lint', qid, wikitext, include]);
	});

	let id = 0;

	/** 用于打印AST */
	class Printer {
		/**
		 * @param {HTMLDivElement} preview 置于下层的代码高亮
		 * @param {HTMLTextAreaElement} textbox 置于上层的文本框
		 * @param {boolean} include 是否嵌入
		 */
		constructor(preview, textbox, include) {
			this.id = id++;
			this.preview = preview;
			this.textbox = textbox;
			this.include = Boolean(include);
			/** @type {[number, string, string][]} */ this.root = [];
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
					this[ticks[0] <= 0 ? ticks[1] : 'tick']();
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
			this.preview.innerHTML = `<span class="wpb-root">${
				this.root.map(([,, printed]) => printed).join('')
			}</span> `;
			this.preview.scrollTop = this.textbox.scrollTop;
			this.preview.classList.remove('active');
			this.textbox.style.color = 'transparent';
		}

		/** 初步解析 */
		async coarsePrint() {
			if (this.running) {
				return undefined;
			}
			const {include, textbox: {value}} = this,
				parsed = await print(value, include, 2, this.id);
			if (this.include !== include || this.textbox.value !== value) {
				this.running = undefined;
				this.running = this.coarsePrint();
				return this.running;
			}
			this.root = parsed;
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
				root,
				preview: {scrollHeight, offsetHeight: parentHeight, scrollTop, children: [rootNode]},
				include,
				textbox: {value},
			} = this;
			let text = value,
				start = 0,
				{length: end} = root;
			if (scrollHeight > parentHeight) {
				const /** @type {HTMLElement[]} */ childNodes = [...rootNode.childNodes],
					headings = childNodes.filter(({className}) => className === 'wpb-heading'),
					{length} = headings;
				if (length > 0) {
					let i = headings.findIndex(({offsetTop, offsetHeight}) => offsetTop + offsetHeight > scrollTop);
					i = i === -1 ? length : i;
					let j = headings.slice(i).findIndex(({offsetTop}) => offsetTop >= scrollTop + parentHeight);
					j = j === -1 ? length : i + j;
					start = i ? childNodes.indexOf(headings[i - 1]) : 0;
					while (i <= j && root[start][0] === MAX_STAGE) {
						start = childNodes.indexOf(headings[i++]);
					}
					end = j === length ? end : childNodes.indexOf(headings[j]);
					while (i <= j && root[end - 1][0] === MAX_STAGE) {
						end = childNodes.indexOf(headings[--j]);
					}
					text = root.slice(start, end).map(([, str]) => str).join('');
				}
			}
			if (start === end) {
				this.running = undefined;
				return undefined;
			}
			const parsed = await print(text, include, MAX_STAGE, this.id);
			if (this.include === include && this.textbox.value === value) {
				this.root.splice(start, end - start, ...parsed);
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

	/** 用于语法分析 */
	class Linter {
		/** @param {boolean} include 是否嵌入 */
		constructor(include) {
			this.id = id++;
			this.include = Boolean(include);
			this.wikitext = undefined;
			/** @type {Promise<LintError[]>} */ this.running = undefined;
		}

		/**
		 * 提交语法分析
		 * @param {string} wikitext 待分析的文本
		 */
		queue(wikitext) {
			this.wikitext = wikitext;
			this.running = this.lint(wikitext);
			return this.running;
		}

		/**
		 * 执行语法分析
		 * @param {string} wikitext 待分析的文本
		 */
		async lint(wikitext) {
			const {include} = this,
				errors = await lint(wikitext, include, this.id);
			return this.include === include && this.wikitext === wikitext ? errors : this.running;
		}
	}

	/**
	 * 高亮textarea
	 * @param {HTMLTextAreaElement} textbox textarea元素
	 * @param {boolean} include 是否嵌入
	 * @throws `TypeError` 不是textarea
	 */
	const wikiparse = (textbox, include) => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse方法仅可用于textarea元素！');
		}
		const preview = document.createElement('div'),
			container = document.createElement('div'),
			printer = new Printer(preview, textbox, include);
		preview.id = 'wikiPretty';
		preview.classList.add('wikiparser', 'active');
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);

		textbox.addEventListener('input', ({isComposing}) => {
			if (!isComposing) {
				printer.queue(2000, 'coarsePrint');
			}
			textbox.style.color = '';
			preview.classList.add('active');
		});
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

	Object.assign(wikiparse, {print, lint, setI18N, setConfig, getConfig, Printer, Linter});
	window.wikiparse = wikiparse;
})();
