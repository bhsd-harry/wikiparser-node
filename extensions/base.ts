import type {Config, LintError, AST, wikiparse as Wikiparse} from './typings';

declare type WorkerListener<T> = (e: {data: [number, T, string]}) => void;

const version = '1.13.4',
	src = (document.currentScript as HTMLScriptElement | null)?.src,
	file = /\/extensions\/dist\/base\.(?:min\.)?js$/u,
	CDN = src && file.test(src)
		? src.replace(file, '')
		: `https://testingcf.jsdelivr.net/gh/bhsd-harry/wikiparser-node@${version}-b`;

/** web worker */
const workerJS = (): void => {
	importScripts('$CDN/bundle/bundle.min.js');
	const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

	/** @implements */
	self.onmessage = ({data}: {
		data: ['setI18N', Record<string, string>]
		| ['setConfig', Config]
		| ['getConfig', number]
		| ['json' | 'lint' | 'print', number, string, boolean?, number?];
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
				postMessage([qid, Parser.parse(wikitext, include, stage).json()]);
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

const blob = new Blob([`(${String(workerJS).replace('$CDN', CDN)})()`], {type: 'text/javascript'}),
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
 * @param stage 解析层级
 */
const json = (wikitext: string, include: boolean, qid = -4, stage?: number): Promise<AST> =>
	getFeedback('json', qid, false, wikitext, include, stage);

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

/**
 * 插入非空文本
 * @param parent span元素
 * @param text 文本
 */
const append = (parent: HTMLElement, text: string | HTMLElement): void => {
	if (text) {
		parent.append(text);
	}
};

/**
 * 将span元素拆分为多个span元素，每个span元素都不包含换行符
 * @param html span元素
 */
const splitNewLine = (html: HTMLElement): HTMLElement[] => {
	let cur = html.cloneNode() as HTMLElement;
	cur.style.padding = '';
	const result = [cur];
	for (const child of html.childNodes as NodeListOf<HTMLElement | Text>) {
		const {textContent} = child;
		if (!textContent?.includes('\n')) {
			cur.append(child.cloneNode(true));
			continue;
		}
		const lines = child.nodeType === Node.TEXT_NODE ? textContent.split('\n') : splitNewLine(child as HTMLElement);
		append(cur, lines[0]!);
		for (const text of lines.slice(1)) {
			cur = html.cloneNode() as HTMLElement;
			cur.style.padding = '';
			result.push(cur);
			append(cur, text);
		}
	}
	return result;
};

/**
 * 获取行号容器
 * @param container 容器
 */
const getGutter = (container: HTMLElement): HTMLElement | null => container.querySelector('.wikiparser-line-numbers');

/**
 * 计算行号
 * @param html 待添加行号的多行文本
 */
const size = (html: HTMLElement): void => {
	const container = html.parentElement!,
		gutter = getGutter(container);
	if (!gutter) {
		intersectionObserver.unobserve(html);
		return;
	}
	html.style.marginLeft = ''; // 在复制之前清除marginLeft
	const start = Number(html.dataset['start'] || 1),
		lines = splitNewLine(html),
		width = `${String(lines.length + start - 1).length + 1.5}ch`;
	html.style.marginLeft = width;
	gutter.style.width = width;
	const sizer = document.createElement('span'),
		{style: {paddingLeft, paddingRight}} = html;
	sizer.className = 'wikiparser-sizer';
	sizer.style.paddingLeft = paddingLeft;
	sizer.style.paddingRight = paddingRight;
	for (const child of lines) {
		sizer.append(child, '\n');
	}
	html.append(sizer);
	let line: HTMLElement | undefined,
		lastTop: number | undefined;
	for (let i = 0; i < lines.length; i++) {
		const child = lines[i]!,
			{top} = child.getBoundingClientRect();
		if (line) {
			line.style.height = `${top - lastTop!}px`;
		}
		line = document.createElement('span');
		line.textContent = String(i + start);
		gutter.append(line);
		lastTop = top;
	}
	if (line) {
		const noScroll = html.offsetHeight <= container.clientHeight;
		if (html.isContentEditable) {
			line.style.height = `${container.clientHeight}px`;
		} else if (noScroll) {
			line.style.height = `${container.getBoundingClientRect().top + container.scrollHeight - lastTop!}px`;
			container.style.overflowY = 'hidden';
		} else {
			line.style.height = `${html.getBoundingClientRect().bottom - lastTop!}px`;
			container.style.overflowY = '';
		}
	}
	sizer.remove();
	intersectionObserver.unobserve(html);
};

const intersectionObserver = new IntersectionObserver(entries => {
	for (const entry of entries) {
		if (!entry.isIntersecting) {
			continue;
		}
		size(entry.target as HTMLElement);
	}
});

/**
 * 添加行号
 * @param html 待添加行号的多行文本
 * @param start 起始行号
 * @param paddingTop 上边距
 */
const lineNumbers = (html: HTMLElement, start = 1, paddingTop = ''): void => {
	const container = html.parentElement!,
		gutter = document.createElement('span');
	html.dataset['start'] = String(start);
	gutter.className = 'wikiparser-line-numbers';
	gutter.style.paddingTop = paddingTop;
	container.classList.add('wikiparse-container');
	container.append(gutter);
	if (getComputedStyle(html).whiteSpace !== 'pre') {
		html.style.whiteSpace = 'pre-wrap';
	}
	if (html.offsetParent) {
		size(html);
	} else {
		intersectionObserver.observe(html);
	}
};

const wikiparse: Wikiparse = {version, CDN, id: 0, setI18N, setConfig, getConfig, print, lint, json, lineNumbers};
Object.assign(window, {wikiparse});
