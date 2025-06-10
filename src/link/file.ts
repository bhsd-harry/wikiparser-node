import {generateForChild, generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	TokenTypes,
	Config,
	LintError,
	AST,
} from '../../base';
import type {
	Token,
	AtomToken,
} from '../../internal';

declare type SeverityPredicate = boolean | ((arg: ImageParameterToken) => boolean);

const frame = new Map([
		['manualthumb', 'Thumb'],
		['frameless', 'Frameless'],
		['framed', 'Frame'],
		['thumbnail', 'Thumb'],
	]),
	argTypes = new Set<TokenTypes>(['arg']),
	transclusion = new Set<TokenTypes>(['template', 'magic-word']),
	horizAlign = new Set(['left', 'right', 'center', 'none']),
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']),
	extensions = new Set(['tiff', 'tif', 'png', 'gif', 'jpg', 'jpeg', 'webp', 'xcf', 'pdf', 'svg', 'djvu']);

/**
 * a more sophisticated string-explode function
 * @param str string to be exploded
 */
const explode = (str?: string): string[] => {
	if (str === undefined) {
		return [];
	}
	const regex = /-\{|\}-|\|/gu,
		exploded: string[] = [];
	let mt = regex.exec(str),
		depth = 0,
		lastIndex = 0;
	while (mt) {
		const {0: match, index} = mt;
		if (match !== '|') {
			depth += match === '-{' ? 1 : -1;
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
 * filter out the image parameters that are not of the specified type
 * @param args image parameter tokens
 * @param types token types to be filtered
 */
const filterArgs = (args: ImageParameterToken[], types: Set<TokenTypes | 'text'>): ImageParameterToken[] =>
	args.filter(({childNodes}) => {
		const visibleNodes = childNodes.filter(node => node.text().trim());
		return visibleNodes.length !== 1 || !types.has(visibleNodes[0]!.type);
	});

/**
 * image
 *
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken[]]}`
 */
export abstract class FileToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken, ...ImageParameterToken[]];
	abstract override get lastChild(): AtomToken | ImageParameterToken;

	override get type(): 'file' | 'gallery-image' | 'imagemap-image' {
		return 'file';
	}

	/** file extension / 扩展名 */
	get extension(): string | undefined {
		return this.getAttribute('title').extension;
	}

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link: string, text?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		const {extension} = this.getTitle(true, true);
		this.safeAppend(explode(text).map(
			// @ts-expect-error abstract class
			(part): ImageParameterToken => new ImageParameterToken(part, extension, config, accum),
		));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			args = filterArgs(this.getAllArgs(), argTypes),
			keys = [...new Set(args.map(({name}) => name))],
			frameKeys = keys.filter(key => frame.has(key)),
			horizAlignKeys = keys.filter(key => horizAlign.has(key)),
			vertAlignKeys = keys.filter(key => vertAlign.has(key)),
			[fr] = frameKeys,
			unscaled = fr === 'framed' || fr === 'manualthumb',
			rect = new BoundingRect(this, start);
		if (
			this.closest('ext-link-text')
			&& (this.getValue('link') as string | undefined)?.trim() !== ''
		) {
			errors.push(generateForSelf(this, rect, 'nested-link', 'internal link in an external link'));
		}
		if (unscaled) {
			for (const arg of args.filter(({name}) => name === 'width')) {
				const e = generateForChild(arg, rect, 'invalid-gallery', 'invalid image parameter');
				e.fix = {desc: 'remove', range: [e.startIndex - 1, e.endIndex], text: ''};
				errors.push(e);
			}
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
		 * @param severity 错误等级
		 */
		const generate = (msg: string, p1: string, severity: SeverityPredicate = true) =>
			(arg: ImageParameterToken): LintError => {
				const isError = typeof severity === 'function' ? severity(arg) : severity,
					e = generateForChild(
						arg,
						rect,
						'no-duplicate',
						Parser.msg(`${msg} image $1 parameter`, p1),
						isError ? 'error' : 'warning',
					);
				e.suggestions = [{desc: 'remove', range: [e.startIndex - 1, e.endIndex], text: ''}];
				return e;
			};
		const {extension} = this;
		for (const key of keys) {
			if (key === 'invalid' || key === 'width' && unscaled) {
				continue;
			}
			const isCaption = key === 'caption';
			let relevantArgs = args.filter(({name}) => name === key);
			if (isCaption) {
				relevantArgs = [
					...relevantArgs.slice(0, -1).filter(arg => arg.text()),
					...relevantArgs.slice(-1),
				];
			}
			if (relevantArgs.length > 1) {
				let severity: SeverityPredicate = !isCaption || !extension || extensions.has(extension);
				if (isCaption && severity) {
					const plainArgs = filterArgs(relevantArgs, transclusion);
					severity = plainArgs.length > 1 && ((arg): boolean => plainArgs.includes(arg));
				}
				errors.push(...relevantArgs.map(generate('duplicated', key, severity)));
			}
		}
		if (frameKeys.length > 1) {
			errors.push(...args.filter(({name}) => frame.has(name)).map(generate('conflicting', 'frame')));
		}
		if (horizAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => horizAlign.has(name))
					.map(generate('conflicting', 'horizontal-alignment')),
			);
		}
		if (vertAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => vertAlign.has(name))
					.map(generate('conflicting', 'vertical-alignment')),
			);
		}
		return errors;
	}

	/**
	 * Get all image parameter tokens
	 *
	 * 获取所有图片参数节点
	 */
	getAllArgs(): ImageParameterToken[] {
		return this.childNodes.slice(1) as ImageParameterToken[];
	}

	/**
	 * Get image parameters with the specified name
	 *
	 * 获取指定图片参数
	 * @param key parameter name / 参数名
	 */
	getArgs(key: string): ImageParameterToken[] {
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * Get the effective image parameter with the specified name
	 *
	 * 获取生效的指定图片参数
	 * @param key parameter name / 参数名
	 */
	getArg(key: string): ImageParameterToken | undefined {
		const args = this.getArgs(key);
		return args[key === 'manualthumb' ? 0 : args.length - 1];
	}

	/**
	 * Get the effective image parameter value
	 *
	 * 获取生效的指定图片参数值
	 * @param key parameter name / 参数名
	 */
	getValue(key: string): string | true | undefined {
		return this.getArg(key)?.getValue();
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start),
			{extension} = this;
		if (extension) {
			json['extension'] = extension;
		}
		return json;
	}
}
