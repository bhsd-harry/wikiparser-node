import type {
	Config,
	ConfigData,
	LintError,
	AST,
	LanguageService,
	wikiparse as Wikiparse,
	Command,
	LintConfig,
} from './typings';

declare type WorkerListener<T> = (e: {data: [string, number, T, string]}) => void;
declare type Token = ReturnType<typeof Parser['parse']>;

const version = '1.34.0',
	src = (document.currentScript as HTMLScriptElement | null)?.src,
	file = /\/extensions\/dist\/base\.(?:min\.)?js$/u,
	CDN = src && file.test(src)
		? src.replace(file, '')
		: `https://testingcf.jsdelivr.net/npm/wikiparser-node@${version}`;

/** web worker */
const workerJS = (): void => {
	importScripts('$CDN/bundle/bundle-lsp.min.js');
	const entities = {'&': 'amp', '<': 'lt', '>': 'gt'},
		lsps = new Map<number, LanguageService>(),
		last: {wikitext?: string, include: boolean, root?: Token} = {include: true};

	/**
	 * 解析
	 * @param wikitext
	 * @param include 是否嵌入
	 * @param stage 解析层级
	 */
	const parse = (wikitext: string, include = false, stage?: number): Token => {
		if (stage === undefined && last.wikitext === wikitext && last.include === include) {
			return last.root!;
		}
		const root = Parser.parse(wikitext, include, stage);
		if (stage === undefined) {
			last.wikitext = wikitext;
			last.include = include;
			last.root = root;
		}
		return root;
	};

	/**
	 * 获取LSP
	 * @param id 请求编号
	 * @param include 是否嵌入
	 */
	const getLSP = (id: number, include = true): LanguageService => {
		if (lsps.has(id)) {
			return lsps.get(id)!;
		}
		const lsp = Parser.createLanguageService();
		lsp.include = include;
		lsps.set(id, lsp);
		return lsp;
	};

	/**
	 * 解析颜色字符串
	 * @param s 颜色字符串
	 */
	const parseColor = (s: string): [number, number, number, number] => {
		if (s.startsWith('#')) {
			const short = s.length < 7;
			return [
				parseInt(short ? s.charAt(1).repeat(2) : s.slice(1, 3), 16),
				parseInt(short ? s.charAt(2).repeat(2) : s.slice(3, 5), 16),
				parseInt(short ? s.charAt(3).repeat(2) : s.slice(5, 7), 16),
				parseInt((short ? s.charAt(4).repeat(2) : s.slice(7, 9)) || 'ff', 16)
				/ 255,
			];
		}
		const values = s.slice(s.indexOf('(') + 1, -1).trim()
			.split(/\s+(?:[,/]\s*)?|[,/]\s*/u)
			.map(v => parseFloat(v) / (v.endsWith('%') ? 100 : 1)) as [number, number, number, number?];
		return [
			values[0],
			values[1],
			values[2],
			values[3] ?? 1,
		];
	};

	/** @implements */
	self.onmessage = ({data}: {data: Command}): void => { // eslint-disable-line no-restricted-globals
		const [command, qid, wikitext, include, stage, newName] = data;
		switch (command) {
			case 'setI18N':
				Parser.i18n = qid;
				break;
			case 'setLintConfig':
				Parser.lintConfig = qid!;
				break;
			case 'setConfig':
				Parser.config = qid;
				for (const lsp of lsps.values()) {
					Object.assign(lsp, {config: Parser.getConfig()});
				}
				delete last.wikitext;
				break;
			case 'getConfig':
				postMessage([command, qid, Parser.getConfig()]);
				break;
			case 'json':
				postMessage([command, qid, parse(wikitext, include, stage).json()]);
				break;
			case 'lint':
				postMessage([command, qid, parse(wikitext, include).lint(), wikitext]);
				break;
			case 'print':
				postMessage([
					command,
					qid,
					parse(wikitext, include, stage).childNodes.map(child => [
						stage ?? Infinity,
						String(child),
						child.type === 'text'
							? String(child).replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`)
							: child.print(),
					]),
				]);
				break;
			case 'destroy':
				getLSP(qid).destroy();
				lsps.delete(qid);
				break;
			case 'data':
				getLSP(qid, include).data = wikitext;
				break;
			case 'colorPresentations':
				postMessage([command, qid, getLSP(qid, include).provideColorPresentations(wikitext)]);
				break;
			case 'documentColors':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideDocumentColors(parseColor, wikitext, false),
						wikitext,
					]);
				})();
				break;
			case 'foldingRanges':
				(async () => {
					postMessage([command, qid, await getLSP(qid, include).provideFoldingRanges(wikitext), wikitext]);
				})();
				break;
			case 'links':
				(async () => {
					postMessage([command, qid, await getLSP(qid, include).provideLinks(wikitext), wikitext]);
				})();
				break;
			case 'diagnostics':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideDiagnostics(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'completionItems':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideCompletionItems(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'references':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideReferences(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'definition':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideDefinition(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'renameLocation':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).resolveRenameLocation(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'renameEdits':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideRenameEdits(wikitext, stage, newName!),
						wikitext,
					]);
				})();
				break;
			case 'hover':
				(async () => {
					postMessage([command, qid, await getLSP(qid, include).provideHover(wikitext, stage), wikitext]);
				})();
				break;
			case 'signatureHelp':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideSignatureHelp(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'inlayHints':
				(async () => {
					postMessage([command, qid, await getLSP(qid, include).provideInlayHints(wikitext), wikitext]);
				})();
				break;
			case 'codeAction':
				(async () => {
					postMessage([
						command,
						qid,
						await getLSP(qid, include).provideRefactoringAction(wikitext, stage),
						wikitext,
					]);
				})();
				break;
			case 'resolveCodeAction':
				postMessage([
					command,
					qid,
					getLSP(qid, include).resolveCodeAction({
						title: `Fix all: ${wikitext || 'WikiLint'}`,
						kind: 'source.fixAll',
						data: {rule: wikitext},
					}),
					wikitext,
				]);
				break;
			case 'findStyleTokens':
				postMessage([command, qid, getLSP(qid).findStyleTokens().map(token => token.json())]);
			// no default
		}
	};
};

const blob = new Blob([`(${String(workerJS).replace('$CDN', CDN)})()`], {type: 'text/javascript'}),
	url = URL.createObjectURL(blob),
	worker = new Worker(url); // same-origin policy
URL.revokeObjectURL(url);

/**
 * 生成事件监听函数
 * @param command 指令名
 * @param qid 输入id
 * @param resolve Promise对象的resolve函数
 * @param raw 原始文本
 */
const getListener = <T>(command: string, qid: number, resolve: (res: T) => void, raw?: string): WorkerListener<T> => {
	/**
	 * 事件监听函数
	 * @param {{data: unknown[]}} e 消息事件
	 */
	const listener: WorkerListener<T> = ({data: [cmd, rid, res, resRaw]}) => {
		if (cmd === command && rid === qid && (raw === undefined || raw === resRaw)) {
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
const setI18N = (i18n?: Record<string, string>): void => {
	worker.postMessage(['setI18N', i18n]);
};

/**
 * 更新Linter设置
 * @param config Linter设置
 */
const setLintConfig = (config?: LintConfig): void => {
	worker.postMessage(['setLintConfig', config]);
};

/**
 * 更新解析设置
 * @param config 设置
 */
const setConfig = (config: ConfigData): void => {
	worker.postMessage(['setConfig', config]);
	wikiparse.config = config;
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
		worker.addEventListener('message', getListener(command, qid, resolve, strict ? raw : undefined));
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
 * 提供语言服务
 * @param command 指令名
 * @param qid 文档编号
 * @param wikitext wikitext
 * @param args 额外参数
 */
const provide = (command: string, qid: number, wikitext?: unknown, ...args: unknown[]): Promise<unknown> =>
	getFeedback(command, qid, typeof wikitext === 'string', wikitext as string, ...args);

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
	for (const child of html.childNodes as unknown as Iterable<HTMLElement | Text>) {
		const {textContent} = child;
		if (!textContent.includes('\n')) {
			cur.append(child.cloneNode(true));
			continue;
		}
		const lines = child.nodeType === Node.TEXT_NODE
			? textContent.split('\n')
			: splitNewLine(child as HTMLElement);
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
const getGutter = (container: HTMLElement): HTMLElement | null =>
	container.querySelector('.wikiparser-line-numbers');

/**
 * 计算行号
 * @param html 待添加行号的多行文本
 */
const size = (html: HTMLElement): void => {
	const container = html.parentElement!,
		{isContentEditable} = html,
		{clientHeight} = container,
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
	if (isContentEditable) {
		gutter.style.minHeight = `${clientHeight + 1}px`;
	}
	const sizer = document.createElement('span'),
		{paddingLeft, paddingRight} = html.style;
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
		if (!isContentEditable && html.offsetHeight <= clientHeight) {
			line.style.height = `${container.getBoundingClientRect().top + container.scrollHeight - lastTop!}px`;
			container.style.overflowY = 'hidden';
		} else {
			line.style.height = `${html.getBoundingClientRect().bottom - lastTop!}px`;
			if (!isContentEditable) {
				container.style.overflowY = '';
			}
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
 * @param paddingBottom 下边距
 */
const lineNumbers = (html: HTMLElement, start = 1, paddingTop = '', paddingBottom = ''): void => {
	const container = html.parentElement!,
		gutter = document.createElement('span');
	html.dataset['start'] = String(start);
	gutter.className = 'wikiparser-line-numbers';
	gutter.style.paddingTop = paddingTop;
	gutter.style.paddingBottom = paddingBottom;
	container.classList.add('wikiparse-container');
	container.append(gutter);
	if (html.isContentEditable) {
		html.style.paddingBottom = `${container.clientHeight}px`;
	}
	if (getComputedStyle(html).whiteSpace !== 'pre') {
		html.style.whiteSpace = 'pre-wrap';
	}
	if (html.offsetParent) {
		size(html);
	} else {
		intersectionObserver.observe(html);
	}
};

const wikiparse: Wikiparse = {
	version,
	CDN,
	id: 0,
	config: {} as ConfigData,
	setI18N,
	setLintConfig,
	setConfig,
	getConfig,
	print,
	lint,
	json,
	lineNumbers,
	provide,
};
Object.assign(window, {wikiparse});
