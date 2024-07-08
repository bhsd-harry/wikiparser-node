import {CodeJar as codeJar} from 'https://testingcf.jsdelivr.net/npm/codejar';
import type {Config, AST} from './typings';

/**
 * Kebab case to Pascal case
 * @param type AST节点类型
 */
const transform = (type?: string): string | undefined =>
	type && type.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');

const keys = new Set(['type', 'childNodes', 'range']);

(async () => {
	// DOM元素
	const textbox = document.querySelector<HTMLDivElement>('#wpTextbox1')!,
		input = document.querySelector<HTMLInputElement>('#wpInclude')!,
		astContainer = document.getElementById('ast')!;

	// Parser初始化
	const config: Config = await (await fetch('./config/default.json')).json();
	Parser.config = config;

	/**
	 * 执行print方法
	 * @param editor 编辑器
	 */
	const highlight = (editor: HTMLElement): void => {
		const root = Parser.parse(editor.textContent!, input.checked);
		editor.innerHTML = root.print();
		const astDom = createAST(root.json());
		astDom.children[0]!.classList.remove('inactive');
		astContainer.replaceChildren(astDom);
	};

	codeJar(textbox, highlight, {
		/* eslint-disable regexp/no-useless-assertions */
		indentOn: /^o^/u,
		moveToNewLine: /^o^/u,
		spellcheck: true,
		/* eslint-enable regexp/no-useless-assertions */
	});

	// 切换是否嵌入
	input.addEventListener('change', () => {
		highlight(textbox);
	});

	let curNode: HTMLElement | undefined,
		curDl: HTMLDListElement | null;

	/**
	 * 创建AST的HTML表示
	 * @param ast AST
	 */
	const createAST = (ast: AST): HTMLDListElement => {
		const entries = Object.entries(ast).filter(([key]) => !keys.has(key)) as [string, string | number | boolean][],
			dl = document.createElement('dl'),
			dt = document.createElement('dt'),
			childNodes = document.createElement('dd'),
			dds = entries.map(([key, value]) => {
				const dd = document.createElement('dd'),
					code = document.createElement('code');
				code.textContent = typeof value === 'string'
					? `"${value.replace(/[\\"]/gu, String.raw`\$&`)}"`
					: String(value);
				code.className = typeof value;
				dd.textContent = `${key}: `;
				dd.append(code);
				return dd;
			}),
			lbrace = document.createElement('span'),
			rbrace1 = document.createElement('span'),
			rbrace2 = document.createElement('span'),
			prop = document.createElement('span');
		dt.textContent = transform(ast.type) ?? 'Text';
		dt.className = 'inactive';
		dl.dataset['start'] = String(ast.range[0]);
		dl.dataset['end'] = String(ast.range[1]);
		if ('childNodes' in ast) {
			childNodes.append(...ast.childNodes.map(createAST));
		}
		lbrace.textContent = ' { ';
		rbrace1.textContent = ' }';
		rbrace2.textContent = '}';
		prop.textContent = entries.map(([key]) => key).join(', ');
		dt.append(lbrace, prop, rbrace1);
		dl.append(dt, ...dds, childNodes, rbrace2);
		return dl;
	};

	/**
	 * 更新hover状态
	 * @param curNode 旧的hover节点
	 * @param nextNode 新的hover节点
	 */
	const updateHover = (nextNode: HTMLElement | undefined): void => {
		if (curNode !== nextNode) {
			curNode?.classList.remove('hover');
			nextNode?.classList.add('hover');
			curNode = nextNode;
		}
	};

	/**
	 * 根据字符位置区间查找对应的DOM节点
	 * @param start 字符位置起点
	 * @param end 字符位置终点
	 */
	const findNode = (start: number, end: number): HTMLElement | undefined => {
		/* eslint-disable no-param-reassign */
		if (start === end) {
			return undefined;
		}
		let cur = textbox.firstChild;
		while (cur) {
			const {length} = cur.textContent!;
			if (start >= length) {
				cur = cur.nextSibling;
				start -= length;
				end -= length;
			} else if (end > length || cur.nodeType === Node.TEXT_NODE) {
				return undefined;
			} else if (start === 0 && end === length) {
				return cur as HTMLElement;
			} else {
				cur = cur.firstChild;
			}
		}
		return undefined;
		/* eslint-enable no-param-reassign */
	};

	const nodeMap = new WeakMap<HTMLDListElement, HTMLElement | undefined>();
	astContainer.addEventListener('click', ({target}) => {
		(target as HTMLElement).closest('dt')?.classList.toggle('inactive');
	});
	astContainer.addEventListener('mouseover', ({target}) => {
		const dl = (target as HTMLElement).closest('dl');
		if (dl !== curDl) {
			curDl?.classList.remove('hover');
			dl?.classList.add('hover');
			curDl = dl;
		}
		if (!dl) {
			updateHover(undefined);
			return;
		}
		let nextNode = nodeMap.get(dl);
		if (nextNode?.isConnected) {
			updateHover(nextNode);
			return;
		}
		const start = Number(dl.dataset['start']),
			end = Number(dl.dataset['end']);
		nextNode = findNode(start, end);
		nodeMap.set(dl, nextNode);
		updateHover(nextNode);
	});
})();
