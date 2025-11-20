import {generateForChild, generateForSelf, fixByRemove, fixByInsert} from '../../util/lint';
import {
	extensions,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
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

	/* NOT FOR BROWSER */

	GalleryToken,
	GalleryImageToken,
} from '../../internal';

/* NOT FOR BROWSER */

import {sanitizeAlt} from '../../util/string';
import {Shadow} from '../../util/debug';
import {Title} from '../../lib/title';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

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
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

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
	args.filter(({childNodes}) => !childNodes.some(node => node.text().trim() && types.has(node.type)));

/**
 * image
 *
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken[]]}`
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

	/**
	 * file extension
	 *
	 * 扩展名
	 * @since v1.5.3
	 */
	get extension(): string | undefined {
		LSP: return this.getAttribute('title').extension;
	}

	/* NOT FOR BROWSER */

	/** image link / 图片链接 */
	override get link(): string | Title {
		return this.getArg('link')?.link ?? super.link;
	}

	override set link(value: string) {
		this.setValue('link', value);
	}

	/** image size / 图片大小 */
	get size(): {width: string, height: string} | undefined {
		const fr = this.getFrame();
		return fr === 'framed' || fr instanceof Title ? undefined : this.getArg('width')?.size;
	}

	set size(size) {
		this.setValue('width', size && size.width + (size.height && 'x') + size.height);
	}

	/** image width / 图片宽度 */
	get width(): string | undefined {
		return this.is<GalleryImageToken>('gallery-image')
			? (this.parentNode as GalleryToken | undefined)?.widths.toString()
			: this.size?.width;
	}

	set width(width) {
		const arg = this.getArg('width');
		if (arg) {
			arg.width = width;
		} else {
			this.setValue('width', width);
		}
	}

	/** image height / 图片高度 */
	get height(): string | undefined {
		return this.is<GalleryImageToken>('gallery-image')
			? (this.parentNode as GalleryToken | undefined)?.heights.toString()
			: this.size?.height;
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
	constructor(link: string, text?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});

		/* NOT FOR BROWSER END */

		const {extension} = this.getTitle(true, true);
		/-\{|\}-|\|/gu; // eslint-disable-line @typescript-eslint/no-unused-expressions
		this.safeAppend(explode(text).map(
			// @ts-expect-error abstract class
			(part): ImageParameterToken => new ImageParameterToken(part, extension, config, accum),
		));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				args = filterArgs(this.getAllArgs(), argTypes),
				keys = [...new Set(args.map(({name}) => name))],
				frameKeys = keys.filter(key => frame.has(key)),
				horizAlignKeys = keys.filter(key => horizAlign.has(key)),
				vertAlignKeys = keys.filter(key => vertAlign.has(key)),
				[fr] = frameKeys,
				unscaled = fr === 'framed' || fr === 'manualthumb',
				rect = new BoundingRect(this, start),
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				{
					ns,
					extension,

					/* NOT FOR BROWSER */

					interwiki,
				} = this.getAttribute('title'),
				{firstChild} = this;
			let rule: LintError.Rule = 'nested-link',
				s = lintConfig.getSeverity(rule, 'file');
			if (
				s
				&& extensions.has(extension!)
				&& this.isInside('ext-link-text')
				&& (this.getValue('link') as string | undefined)?.trim() !== ''
			) {
				const e = generateForSelf(this, rect, rule, 'link-in-extlink', s);
				if (computeEditInfo || fix) {
					const link = this.getArg('link');
					if (link) {
						const from = start + link.getRelativeIndex();
						e.fix = {
							desc: Parser.msg('delink'),
							range: [from, from + link.toString().length],
							text: 'link=',
						};
					} else {
						e.fix = fixByInsert(e.endIndex - 2, 'delink', '|link=');
					}
				}
				errors.push(e);
			}
			rule = 'invalid-gallery';
			s = lintConfig.getSeverity(rule, 'extension');
			if (
				s && ns === 6 && !extension && !firstChild.querySelector('arg,magic-word,template')
				&& !interwiki
			) {
				errors.push(generateForSelf(this, rect, rule, 'missing-extension', s));
			}
			s = lintConfig.getSeverity(rule, 'parameter');
			if (s && unscaled) {
				for (const arg of args.filter(({name}) => name === 'width')) {
					const e = generateForChild(arg, rect, rule, 'invalid-image-parameter', s);
					if (computeEditInfo || fix) {
						e.fix = fixByRemove(e, -1);
					}
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
			rule = 'no-duplicate';
			const severities = ['unknownImageParameter', 'imageParameter'].map(k => lintConfig.getSeverity(rule, k));

			/**
			 * 图片参数到语法错误的映射
			 * @param tokens 图片参数节点
			 * @param msg 消息键
			 * @param p1 替换$1
			 * @param severity 错误等级
			 */
			const generate = (
				tokens: ImageParameterToken[],
				msg: 'conflicting' | 'duplicate',
				p1: string,
				severity: SeverityPredicate = true,
			): LintError[] => tokens.map(arg => {
				s = severities[Number(typeof severity === 'function' ? severity(arg) : severity)]!;
				if (!s) {
					return false;
				}

				/** `conflicting-image-parameter`或`duplicate-image-parameter` */
				const e = generateForChild(arg, rect, rule, Parser.msg(`${msg}-image-parameter`, p1), s);
				if (computeEditInfo) {
					e.suggestions = [fixByRemove(e, -1)];
				}
				return e;
			}).filter((e): e is LintError => e !== false);
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
					Array.prototype.push.apply(errors, generate(relevantArgs, 'duplicate', key, severity));
				}
			}
			if (frameKeys.length > 1) {
				Array.prototype.push.apply(
					errors,
					generate(args.filter(({name}) => frame.has(name)), 'conflicting', 'frame'),
				);
			}
			if (horizAlignKeys.length > 1) {
				Array.prototype.push.apply(
					errors,
					generate(
						args.filter(({name}) => horizAlign.has(name)),
						'conflicting',
						'horizontal-alignment',
					),
				);
			}
			if (vertAlignKeys.length > 1) {
				Array.prototype.push.apply(
					errors,
					generate(
						args.filter(({name}) => vertAlign.has(name)),
						'conflicting',
						'vertical-alignment',
					),
				);
			}
			return errors;
		}
	}

	/**
	 * Get all image parameter tokens
	 *
	 * 获取所有图片参数节点
	 */
	getAllArgs(): ImageParameterToken[] {
		LINT: return this.childNodes.slice(1) as ImageParameterToken[];
	}

	/**
	 * Get image parameters with the specified name
	 *
	 * 获取指定图片参数
	 * @param key parameter name / 参数名
	 */
	getArgs(key: string): ImageParameterToken[] {
		LINT: return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * Get the effective image parameter with the specified name
	 *
	 * 获取生效的指定图片参数
	 * @param key parameter name / 参数名
	 */
	getArg(key: string): ImageParameterToken | undefined {
		LINT: {
			const args = this.getArgs(key);
			return args[key === 'manualthumb' ? 0 : args.length - 1];
		}
	}

	/**
	 * Get the effective image parameter value
	 *
	 * 获取生效的指定图片参数值
	 * @param key parameter name / 参数名
	 */
	getValue(key: string): string | true | undefined {
		LINT: return this.getArg(key)?.getValue();
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start),
				{extension} = this;
			if (extension) {
				json['extension'] = extension;
			}
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param keys 接受的参数名
	 * @param type 类型名
	 */
	#getTypedArgs(keys: Set<string> | Map<string, string>, type: string): ImageParameterToken[] {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		if (args.length > 1) {
			Parser.warn(
				`The image ${this.name} has ${args.length} ${type} parameters. Only the last ${
					args[0]!.name
				} will take effect!`,
			);
		}
		return args;
	}

	/**
	 * Get image frame parameter tokens
	 *
	 * 获取图片框架属性参数节点
	 */
	getFrameArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(frame, 'frame');
	}

	/**
	 * Get image horizontal alignment parameter tokens
	 *
	 * 获取图片水平对齐参数节点
	 */
	getHorizAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(horizAlign, 'horizontal-align');
	}

	/**
	 * Get image vertical alignment parameter tokens
	 *
	 * 获取图片垂直对齐参数节点
	 */
	getVertAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(vertAlign, 'vertical-align');
	}

	/**
	 * Get the effective image frame paremter value
	 *
	 * 获取生效的图片框架属性参数
	 * @since v1.11.0
	 */
	getFrame(): string | Title | undefined {
		const [arg] = this.getFrameArgs(),
			val = arg?.name;
		return val === 'manualthumb' ? arg!.thumb : val;
	}

	/**
	 * Get the effective image horizontal alignment parameter value
	 *
	 * 获取生效的图片水平对齐参数
	 * @since v1.11.0
	 */
	getHorizAlign(): string | undefined {
		return this.getHorizAlignArgs()[0]?.name;
	}

	/**
	 * Get the effective image vertical alignment parameter value
	 *
	 * 获取生效的图片垂直对齐参数
	 * @since v1.11.0
	 */
	getVertAlign(): string | undefined {
		return this.getVertAlignArgs()[0]?.name;
	}

	/**
	 * Check if the image contains the specified parameter
	 *
	 * 是否具有指定图片参数
	 * @param key parameter name / 参数名
	 */
	hasArg(key: string): boolean {
		return this.getArgs(key).length > 0;
	}

	/**
	 * Remove the specified image parameter
	 *
	 * 移除指定图片参数
	 * @param key parameter name / 参数名
	 */
	removeArg(key: string): void {
		for (const token of this.getArgs(key)) {
			this.removeChild(token);
		}
	}

	/**
	 * Get all image parameter names
	 *
	 * 获取图片参数名
	 */
	getKeys(): Set<string> {
		return new Set(this.getAllArgs().map(({name}) => name));
	}

	/**
	 * Get the image parameter values with the specified name
	 *
	 * 获取指定的图片参数值
	 * @param key parameter name / 参数名
	 */
	getValues(key: string): (string | true)[] {
		return this.getArgs(key).map(token => token.getValue());
	}

	/**
	 * Set the image parameter
	 *
	 * 设置图片参数
	 * @param key parameter name / 参数名
	 * @param value parameter value / 参数值
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
		/* istanbul ignore if */
		if (syntax === undefined) {
			throw new RangeError(`Unknown image parameter: ${key}`);
		}
		const free = syntax.includes('$1');
		/* istanbul ignore if */
		if (value === true && free) {
			this.typeError('setValue', 'String');
		}
		const parameter = Shadow.run(
			(): ImageParameterToken =>
				// @ts-expect-error abstract class
				new ImageParameterToken(
					syntax.replace('$1', key === 'width' ? '1' : ''),
					this.extension,
					config,
				),
		);
		if (free) {
			const {childNodes} = Parser.parseWithRef(value as string, this);
			parameter.safeReplaceChildren(childNodes);
		}
		this.insertAt(parameter);
	}

	/* istanbul ignore next */
	/**
	 * @override
	 * @throws `Error` 不适用于图片
	 */
	override setLinkText(): never {
		throw new Error('LinkBaseToken.setLinkText method is not applicable to images!');
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		/** @ignore */
		const isInteger = (n: string | undefined): boolean => Boolean(n && !/\D/u.test(n));
		const {link, width, height, type} = this,
			file = this.getAttribute('title'),
			fr = this.getFrame(),
			manual = fr instanceof Title,
			visibleCaption = manual || fr === 'thumbnail' || fr === 'framed' || type === 'gallery-image',
			caption = this.getArg('caption')?.toHtmlInternal({
				...opt,
				nowrap: true,
			}) ?? '',
			titleFromCaption = visibleCaption && type !== 'gallery-image' ? '' : sanitizeAlt(caption)!,
			hasLink = manual || link !== file,
			title = titleFromCaption || (hasLink && typeof link !== 'string' ? link.getTitleAttr() : ''),
			titleAttr = title && ` title="${title}"`,
			alt = sanitizeAlt(this.getArg('alt')?.toHtmlInternal({
				...opt,
				nowrap: true,
			})) ?? titleFromCaption,
			horiz = this.getHorizAlign() ?? '',
			vert = this.getVertAlign() ?? '',
			className = `${horiz ? `mw-halign-${horiz}` : vert && `mw-valign-${vert}`}${
				this.getValue('border') ? ' mw-image-border' : ''
			} ${sanitizeAlt(this.getValue('class') as string | undefined) ?? ''}`.trim(),
			classAttr = className && ` class="${className}"`,
			img = `<img${alt && ` alt="${alt}"`} src="${
				(manual ? fr : file).getUrl()
			}" decoding="async" class="mw-file-element"${
				isInteger(width) ? ` width="${width}"` : ''
			}${isInteger(height) ? ` height="${height}"` : ''}>`;
		let href = '';
		if (link) {
			try {
				href = typeof link === 'string' ? this.getArg('link')!.getUrl()! : link.getUrl();
				if (link === file) {
					const lang = this.getValue('lang') as string | undefined,
						page = this.getValue('page') as string | undefined;
					if (lang) {
						href += `?lang=${lang}`;
					} else if (page) {
						href += `?page=${page}`;
					}
				}
			} catch {}
		}
		const a = link
			? `<a${href && ` href="${href}"`}${hasLink ? '' : ' class="mw-file-description"'}${titleAttr}${
				typeof link === 'string' ? ' rel="nofollow"' : ''
			}>${img}</a>`
			: `<span${titleAttr}>${img}</span>`;
		if (type !== 'gallery-image') {
			return horiz || visibleCaption
				? `<figure${classAttr} typeof="mw:File${
					fr ? `/${manual ? 'Thumb' : frame.get(fr)}` : ''
				}">${a}<figcaption>${caption}</figcaption></figure>`
				: `<span${classAttr}>${a}</span>`;
		}
		const parent = this.parentNode as GalleryToken | undefined,
			mode = parent?.parentNode?.getAttr('mode'),
			nolines = typeof mode === 'string' && mode.toLowerCase() === 'nolines',
			padding = nolines ? 0 : 30;
		return `\t<li class="gallerybox" style="width: ${
			Number(width) + padding + 5
		}px">\n\t\t<div class="thumb" style="width: ${Number(width) + padding}px${
			nolines ? '' : `; height: ${Number(height) + padding}px`
		}"><span>${a}</span></div>\n\t\t<div class="gallerytext">${
			parent?.parentNode?.hasAttr('showfilename')
				? `<a href="${file.getUrl()}" class="galleryfilename galleryfilename-truncate" title="${
					file.title
				}">${file.main}</a>\n`
				: ''
		}${caption}</div>\n\t</li>`;
	}
}

classes['FileToken'] = __filename;
