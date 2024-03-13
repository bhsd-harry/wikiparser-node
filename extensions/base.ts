import type {Config, LintError, AST, wikiparse as Wikiparse} from './typings';

declare type WorkerListener<T> = ({data: [rid, res, resRaw]}: {data: [number, T, string]}) => void;

/** web worker */
const workerJS = (): void => {
	importScripts('https://testingcf.jsdelivr.net/npm/wikiparser-node@1.6.1-b/bundle/bundle.min.js');
	const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

	/** @implements */
	self.onmessage = ({data}: {
		data: ['setI18N', Record<string, string>]
		| ['setConfig', Config]
		| ['getConfig', number]
		| ['json' | 'lint', number, string, boolean?]
		| ['print', number, string, boolean?, number?];
	}): void => {
		const [command, qid, wikitext, include, stage] = data;
		switch (command) {
			case 'setI18N':
				Parser.i18n = qid;
				break;
			case 'setConfig':
				Parser.config = qid;
				break;
			case 'getConfig':
				postMessage([qid, Parser.getConfig()]);
				break;
			case 'json':
				postMessage([qid, Parser.parse(wikitext, include).json()]);
				break;
			case 'lint':
				postMessage([qid, Parser.parse(wikitext, include).lint(), wikitext]);
				break;
			case 'print':
				postMessage([
					qid,
					Parser.parse(wikitext, include, stage).childNodes.map(child => [
						stage ?? Infinity,
						String(child),
						child.type === 'text'
							? String(child).replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`)
							: child.print(),
					]),
				]);
			// no default
		}
	};
};

const blob = new Blob([`(${String(workerJS)})()`], {type: 'text/javascript'}),
	url = URL.createObjectURL(blob),
	worker = new Worker(url);
URL.revokeObjectURL(url);

/**
 * 生成事件监听函数
 * @param qid 输入id
 * @param resolve Promise对象的resolve函数
 * @param raw 原始文本
 */
const getListener = <T>(qid: number, resolve: (res: T) => void, raw?: string): WorkerListener<T> => {
	/**
	 * 事件监听函数
	 * @param {{data: [number, T, string]}} e 消息事件
	 */
	const listener: WorkerListener<T> = ({data: [rid, res, resRaw]}) => {
		if (rid === qid && (raw === undefined || raw === resRaw)) {
			worker.removeEventListener('message', listener);
			resolve(res);
		}
	};
	return listener;
};

/**
 * 更新I18N消息
 * @param i18n I18N消息
 */
const setI18N = (i18n: Record<string, string>): void => {
	worker.postMessage(['setI18N', i18n]);
};

/**
 * 更新解析设置
 * @param config 设置
 */
const setConfig = (config: Config): void => {
	worker.postMessage(['setConfig', config]);
};

/**
 * 获取反馈
 * @param command 指令名
 * @param qid 编号
 * @param strict 严格模式
 * @param raw 原始文本
 * @param args 参数
 */
const getFeedback = <T>(command: string, qid: number, strict?: boolean, raw?: string, ...args: unknown[]): Promise<T> =>
	new Promise(resolve => {
		worker.addEventListener('message', getListener(qid, resolve, strict ? raw : undefined));
		worker.postMessage([command, qid, raw, ...args]);
	});

/** 获取Parser.minConfig */
const getConfig = (): Promise<Config> => getFeedback('getConfig', -3);

/**
 * 获取JSON
 * @param wikitext wikitext
 * @param include 是否嵌入
 * @param qid 编号
 */
const json = (wikitext: string, include: boolean, qid: number): Promise<AST> =>
	getFeedback('json', qid, false, wikitext, include);

/**
 * 将解析改为异步执行
 * @param wikitext wikitext
 * @param include 是否嵌入
 * @param stage 解析层级
 * @param qid Printer编号
 */
const print = (
	wikitext: string,
	include?: boolean,
	stage?: number,
	qid = -1,
): Promise<[number, string, string][]> => getFeedback('print', qid, false, wikitext, include, stage);

/**
 * 将语法分析改为异步执行
 * @param wikitext wikitext
 * @param include 是否嵌入
 * @param qid Linter编号，暂时固定为`-2`
 */
const lint = (wikitext: string, include?: boolean, qid = -2): Promise<LintError[]> =>
	getFeedback('lint', qid, true, wikitext, include);

const wikiparse: Wikiparse = {id: 0, setI18N, setConfig, getConfig, print, lint, json};
Object.assign(window, {wikiparse});
