import {explode, noWrap} from '../../util/string';
import {generateForChild} from '../../util/lint';
import {Parser} from '../../index';
import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {Title} from '../../lib/title';
import type {LintError} from '../../index';
import type {Token, AtomToken} from '../../internal';

const frame = new Set(['manualthumb', 'frameless', 'framed', 'thumbnail']),
	horizAlign = new Set(['left', 'right', 'center', 'none']),
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
export abstract class FileToken extends LinkBaseToken {
	/** @browser */
	override readonly type: 'file' | 'gallery-image' | 'imagemap-image' = 'file';
	declare childNodes: [AtomToken, ...ImageParameterToken[]];
	abstract override get children(): [AtomToken, ...ImageParameterToken[]];
	abstract override get lastChild(): ImageParameterToken;
	abstract override get lastElementChild(): ImageParameterToken;

	/** 图片链接 */
	override get link(): string | Title {
		return this.getArg('link')?.link ?? super.link;
	}

	override set link(value) {
		this.setValue('link', String(value));
	}

	/** 图片大小 */
	get size(): {width: string, height: string} | undefined {
		return this.getArg('width')?.size;
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

	/**
	 * @browser
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link: string, text?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});
		this.append(...explode('-{', '}-', '|', text).map(
			// @ts-expect-error abstract class
			part => new ImageParameterToken(part, config, accum) as ImageParameterToken,
		));
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			args = this.getAllArgs().filter(({childNodes}) => {
				const visibleNodes = childNodes.filter(node => node.text().trim());
				return visibleNodes.length !== 1 || visibleNodes[0]!.type !== 'arg';
			}),
			keys = [...new Set(args.map(({name}) => name))].filter(key => key !== 'invalid'),
			frameKeys = keys.filter(key => frame.has(key)),
			horizAlignKeys = keys.filter(key => horizAlign.has(key)),
			vertAlignKeys = keys.filter(key => vertAlign.has(key));
		if (args.length === keys.length
			&& frameKeys.length < 2 && horizAlignKeys.length < 2 && vertAlignKeys.length < 2
		) {
			return errors;
		}
		const rect = {start, ...this.getRootNode().posFromIndex(start)};
		for (const key of keys) {
			let relevantArgs = args.filter(({name}) => name === key);
			if (key === 'caption') {
				relevantArgs = [
					...relevantArgs.slice(0, -1).filter(arg => arg.text()),
					...relevantArgs.slice(-1),
				];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(arg => generateForChild(
					arg, rect, Parser.msg('duplicated image $1 parameter', key),
				)));
			}
		}
		if (frameKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => frame.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'frame'),
				)),
			);
		}
		if (horizAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => horizAlign.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'horizontal-alignment'),
				)),
			);
		}
		if (vertAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => vertAlign.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'vertical-alignment'),
				)),
			);
		}
		return errors;
	}

	/**
	 * 获取所有图片参数节点
	 * @browser
	 */
	getAllArgs(): ImageParameterToken[] {
		const {childNodes: [, ...args]} = this;
		return args;
	}

	/**
	 * 获取指定图片参数
	 * @browser
	 * @param key 参数名
	 */
	getArgs(key: string): ImageParameterToken[] {
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @browser
	 * @param keys 接受的参数名
	 * @param type 类型名
	 */
	#getTypedArgs(keys: Set<string>, type: string): ImageParameterToken[] {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		if (args.length > 1) {
			Parser.warn(`图片 ${this.name} 带有 ${args.length} 个${type}参数，只有最后 1 个 ${args[0]!.name} 会生效！`);
		}
		return args;
	}

	/**
	 * 获取图片框架属性参数节点
	 * @browser
	 */
	getFrameArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(frame, '框架');
	}

	/**
	 * 获取图片水平对齐参数节点
	 * @browser
	 */
	getHorizAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(horizAlign, '水平对齐');
	}

	/**
	 * 获取图片垂直对齐参数节点
	 * @browser
	 */
	getVertAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(vertAlign, '垂直对齐');
	}

	/**
	 * 获取生效的指定图片参数
	 * @param key 参数名
	 */
	getArg(key: string): ImageParameterToken | undefined {
		return this.getArgs(key).at(-1);
	}

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
	 * 获取生效的指定图片参数值
	 * @param key 参数名
	 */
	getValue(key: string): string | true | undefined {
		return this.getArg(key)?.getValue();
	}

	/**
	 * 设置图片参数
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `RangeError` 未定义的图片参数
	 * @throws `SyntaxError` 非法的参数
	 */
	setValue(key: string, value: string | boolean | undefined = false): void {
		if (value === false) {
			this.removeArg(key);
			return;
		}
		const token = this.getArg(key);
		if (token) {
			token.setValue(value);
			return;
		}
		let syntax: string | undefined = '';
		const config = this.getAttribute('config');
		if (key !== 'caption') {
			syntax = Object.entries(config.img).find(([, name]) => name === key)?.[0];
			if (!syntax) {
				throw new RangeError(`未定义的图片参数： ${key}`);
			}
		}
		if (value === true) {
			if (syntax.includes('$1')) {
				this.typeError('setValue', 'Boolean');
			}
			// @ts-expect-error abstract class
			const newArg = Parser.run(() => new ImageParameterToken(syntax, config) as ImageParameterToken);
			this.insertAt(newArg);
			return;
		}
		const wikitext = `[[File:F|${syntax ? syntax.replace('$1', value) : value}]]`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 6, config),
			{length, firstChild: file} = root;
		if (length !== 1 || file!.type !== 'file' || file!.length !== 2) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		const {name, lastChild: imageParameter} = file as this;
		if (name !== 'File:F' || imageParameter.name !== key) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		this.insertAt(imageParameter);
	}
}

Parser.classes['FileToken'] = __filename;
