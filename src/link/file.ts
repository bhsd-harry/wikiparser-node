import {escapeRegExp} from '../../util/string';
import {generateForChild, generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {Title} from '../../lib/title';
import type {LintError} from '../../base';
import type {Token, AtomToken} from '../../internal';

const frame = new Set(['manualthumb', 'frameless', 'framed', 'thumbnail']),
	horizAlign = new Set(['left', 'right', 'center', 'none']),
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

/**
 * a more sophisticated string-explode function
 * @param start start syntax of a nested AST node
 * @param end end syntax of a nested AST node
 * @param separator syntax for explosion
 * @param str string to be exploded
 */
const explode = (start: string, end: string, separator: string, str?: string): string[] => {
	if (str === undefined) {
		return [];
	}
	const regex = new RegExp(`${[start, end, separator].map(escapeRegExp).join('|')}`, 'gu'),
		exploded: string[] = [];
	let mt = regex.exec(str),
		depth = 0,
		lastIndex = 0;
	while (mt) {
		const {0: match, index} = mt;
		if (match !== separator) {
			depth += match === start ? 1 : -1;
		} else if (depth === 0) {
			exploded.push(str.slice(lastIndex, index));
			({lastIndex} = regex);
		}
		mt = regex.exec(str);
	}
	exploded.push(str.slice(lastIndex));
	return exploded;
};

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
export abstract class FileToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken, ...ImageParameterToken[]];
	abstract override get lastChild(): AtomToken | ImageParameterToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, ...ImageParameterToken[]];
	abstract override get lastElementChild(): AtomToken | ImageParameterToken;

	/* NOT FOR BROWSER END */

	override get type(): 'file' | 'gallery-image' | 'imagemap-image' {
		return 'file';
	}

	/** 扩展名 */
	get extension(): string | undefined {
		return this.getTitle().extension;
	}

	/* NOT FOR BROWSER */

	/** 图片链接 */
	override get link(): string | Title {
		return this.getArg('link')?.link ?? super.link;
	}

	override set link(value: string) {
		this.setValue('link', value);
	}

	/** 图片大小 */
	get size(): {width: string, height: string} | undefined {
		return this.getArg('width')?.size;
	}

	set size(size) {
		this.setValue('width', size && size.width + (size.height && 'x') + size.height);
	}

	/** 图片宽度 */
	get width(): string | undefined {
		return this.size?.width;
	}

	set width(width) {
		const arg = this.getArg('width');
		if (arg) {
			arg.width = width;
		} else {
			this.setValue('width', width);
		}
	}

	/** 图片高度 */
	get height(): string | undefined {
		return this.size?.height;
	}

	set height(height) {
		const arg = this.getArg('width');
		if (arg) {
			arg.height = height;
		} else {
			this.setValue('width', height && `x${height}`);
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link: string, text?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});

		/* NOT FOR BROWSER END */

		const {extension} = this.getTitle(true);
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/-\{|\}-|\|/gu;
		this.append(...explode('-{', '}-', '|', text).map(
			// @ts-expect-error abstract class
			part => new ImageParameterToken(part, extension, config, accum) as ImageParameterToken,
		));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			args = this.getAllArgs().filter(({childNodes}) => {
				const visibleNodes = childNodes.filter(node => node.text().trim());
				return visibleNodes.length !== 1 || visibleNodes[0]!.type !== 'arg';
			}),
			keys = [...new Set(args.map(({name}) => name))].filter(key => key !== 'invalid'),
			frameKeys = keys.filter(key => frame.has(key)),
			horizAlignKeys = keys.filter(key => horizAlign.has(key)),
			vertAlignKeys = keys.filter(key => vertAlign.has(key)),
			rect = new BoundingRect(this, start);
		if (this.closest('ext-link-text') && (this.getValue('link') as string | undefined)?.trim() !== '') {
			errors.push(generateForSelf(this, rect, 'nested-link', 'internal link in an external link'));
		}
		if (
			args.length === keys.length
			&& frameKeys.length < 2
			&& horizAlignKeys.length < 2
			&& vertAlignKeys.length < 2
		) {
			return errors;
		}

		/**
		 * 图片参数到语法错误的映射
		 * @param msg 消息键
		 * @param p1 替换$1
		 */
		const generate = (msg: string, p1: string) =>
			(arg: ImageParameterToken): LintError =>
				generateForChild(arg, rect, 'no-duplicate', Parser.msg(`${msg} image $1 parameter`, p1));
		for (const key of keys) {
			let relevantArgs = args.filter(({name}) => name === key);
			if (key === 'caption') {
				relevantArgs = [...relevantArgs.slice(0, -1).filter(arg => arg.text()), ...relevantArgs.slice(-1)];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(generate('duplicated', key)));
			}
		}
		if (frameKeys.length > 1) {
			errors.push(...args.filter(({name}) => frame.has(name)).map(generate('conflicting', 'frame')));
		}
		if (horizAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => horizAlign.has(name)).map(generate('conflicting', 'horizontal-alignment')),
			);
		}
		if (vertAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => vertAlign.has(name)).map(generate('conflicting', 'vertical-alignment')),
			);
		}
		return errors;
	}

	/** 获取所有图片参数节点 */
	getAllArgs(): ImageParameterToken[] {
		return this.childNodes.slice(1) as ImageParameterToken[];
	}

	/**
	 * 获取指定图片参数
	 * @param key 参数名
	 */
	getArgs(key: string): ImageParameterToken[] {
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param keys 接受的参数名
	 * @param type 类型名
	 */
	#getTypedArgs(keys: Set<string>, type: string): ImageParameterToken[] {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));

		/* NOT FOR BROWSER */

		if (args.length > 1) {
			Parser.warn(
				`The image ${this.name} has ${args.length} ${type} parameters. Only the last ${
					args[0]!.name
				} will take effect!`,
			);
		}

		/* NOT FOR BROWSER END */

		return args;
	}

	/** 获取图片框架属性参数节点 */
	getFrameArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(frame, 'frame');
	}

	/** 获取图片水平对齐参数节点 */
	getHorizAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(horizAlign, 'horizontal-align');
	}

	/** 获取图片垂直对齐参数节点 */
	getVertAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(vertAlign, 'vertical-align');
	}

	/**
	 * 获取生效的指定图片参数
	 * @param key 参数名
	 */
	getArg(key: string): ImageParameterToken | undefined {
		const args = this.getArgs(key);
		return args[args.length - 1];
	}

	/**
	 * 获取生效的指定图片参数值
	 * @param key 参数名
	 */
	getValue(key: string): string | true | undefined {
		return this.getArg(key)?.getValue();
	}

	/* NOT FOR BROWSER */

	/**
	 * 是否具有指定图片参数
	 * @param key 参数名
	 */
	hasArg(key: string): boolean {
		return this.getArgs(key).length > 0;
	}

	/**
	 * 移除指定图片参数
	 * @param key 参数名
	 */
	removeArg(key: string): void {
		for (const token of this.getArgs(key)) {
			this.removeChild(token);
		}
	}

	/** 获取图片参数名 */
	getKeys(): Set<string> {
		return new Set(this.getAllArgs().map(({name}) => name));
	}

	/**
	 * 获取指定的图片参数值
	 * @param key 参数名
	 */
	getValues(key: string): (string | true)[] {
		return this.getArgs(key).map(token => token.getValue());
	}

	/**
	 * 设置图片参数
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `RangeError` 未定义的图片参数
	 */
	setValue(key: string, value: string | boolean = false): void {
		if (value === false) {
			this.removeArg(key);
			return;
		}
		const token = this.getArg(key);
		if (token) {
			token.setValue(value);
			return;
		}
		const config = this.getAttribute('config'),
			syntax = key === 'caption' ? '$1' : Object.entries(config.img).find(([, name]) => name === key)?.[0];
		if (syntax === undefined) {
			throw new RangeError(`Unknown image parameter: ${key}`);
		}
		const free = syntax.includes('$1');
		if (value === true && free) {
			this.typeError('setValue', 'String');
		}
		const parameter: ImageParameterToken = Shadow.run(
			// @ts-expect-error abstract class
			() => new ImageParameterToken(syntax.replace('$1', ''), this.extension, config),
		);
		if (free) {
			const {childNodes} = Parser.parse(value as string, this.getAttribute('include'), undefined, config);
			parameter.replaceChildren(...childNodes);
		}
		parameter.afterBuild();
		this.insertAt(parameter);
	}

	/**
	 * @override
	 * @throws `Error` 不适用于图片
	 */
	override setLinkText(): never {
		throw new Error('LinkBaseToken.setLinkText method is not applicable to images!');
	}
}

classes['FileToken'] = __filename;
