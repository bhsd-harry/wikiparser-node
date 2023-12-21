import type {Config, LintError} from '../base';
import type {wikiparse as Wikiparse} from './typings';

declare type WorkerListener<T> = ({data: [rid, res, resRaw]}: {data: [number, T, string]}) => void;

/** web worker */
const workerJS = (): void => {
	importScripts('https://testingcf.jsdelivr.net/gh/bhsd-harry/wikiparser-node@1.1.5-b/bundle/bundle.min.js');
	const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

	/** @implements */
	self.onmessage = ({data}: {
		data: ['setI18N', Record<string, string>]
			| ['setConfig', Config]
			| ['getConfig', number]
			| ['lint', number, string, boolean?]
			| ['print', number, string, boolean?, number?];
	}): void => {
		const [command, qid, ...args] = data;
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
			case 'lint':
				postMessage([qid, Parser.parse(...(args as [string, boolean?])).lint(), args[0]!]);
				break;
			// case 'print':
			default: {
				const stage = args[2] ?? Infinity;
				postMessage([
					qid,
					Parser.parse(...(args as [string, boolean?, number?])).childNodes.map(child => [
						stage,
						String(child),
						child.type === 'text'
							? String(child).replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`)
							: child.print(),
					]),
				]);
			}
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

/** 获取Parser.minConfig */
const getConfig = (): Promise<Config> => new Promise(resolve => {
	worker.addEventListener('message', getListener(-3, resolve));
	worker.postMessage(['getConfig', -3]);
});

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
): Promise<[number, string, string][]> =>
	new Promise(resolve => {
		worker.addEventListener('message', getListener(qid, resolve));
		worker.postMessage(['print', qid, wikitext, include, stage]);
	});

/**
 * 将语法分析改为异步执行
 * @param wikitext wikitext
 * @param include 是否嵌入
 * @param qid Linter编号，暂时固定为`-2`
 */
const lint = (wikitext: string, include?: boolean, qid = -2): Promise<LintError[]> => new Promise(resolve => {
	worker.addEventListener('message', getListener(qid, resolve, wikitext));
	worker.postMessage(['lint', qid, wikitext, include]);
});

const wikiparse: Wikiparse = {id: 0, setI18N, setConfig, getConfig, print, lint};
Object.assign(window, {wikiparse});
