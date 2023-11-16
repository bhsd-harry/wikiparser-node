'use strict';

(() => {
	const MAX_STAGE = 11;

	/** web worker */
	const workerJS = () => {
		self.importScripts('https://fastly.jsdelivr.net/gh/bhsd-harry/wikiparser-node@0.11.0-b/bundle/bundle.min.js');
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
		/**
		 * 事件监听函数
		 * @param {{data: [number, *, string]}} e 消息事件
		 */
		const listener = ({data: [rid, res, resRaw]}) => {
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

	const wikiparse = {id: 0, setI18N, setConfig, getConfig, print, lint};
	Object.defineProperty(wikiparse, 'MAX_STAGE', {value: MAX_STAGE, enumerable: true, configurable: true});

	/** 用于语法分析 */
	class Linter {
		/** @param {boolean} include 是否嵌入 */
		constructor(include) {
			this.id = wikiparse.id++;
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

	wikiparse.Linter = Linter;
	window.wikiparse = wikiparse;
})();
