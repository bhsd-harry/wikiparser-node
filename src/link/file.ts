import {generateForChild, generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	Config,
	LintError,
	AST,
} from '../../base';
import type {
	Token,
	AtomToken,

	/* NOT FOR BROWSER */

	GalleryToken,
} from '../../internal';

/* NOT FOR BROWSER */

import {sanitizeAlt} from '../../util/string';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {Title} from '../../lib/title';

/* NOT FOR BROWSER END */

const frame = new Map([
		['manualthumb', 'Thumb'],
		['frameless', 'Frameless'],
		['framed', 'Frame'],
		['thumbnail', 'Thumb'],
	]),
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

	/** file extension / 扩展名 */
	get extension(): string | undefined {
		return this.getAttribute('title').extension;
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
		return this.type === 'gallery-image'
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
		return this.type === 'gallery-image'
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
		const errors = super.lint(start, re),
			args = this.getAllArgs().filter(({childNodes}) => {
				const visibleNodes = childNodes.filter(node => node.text().trim());
				return visibleNodes.length !== 1 || visibleNodes[0]!.type !== 'arg';
			}),
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
				e.fix = {range: [e.startIndex - 1, e.endIndex], text: '', desc: 'remove'};
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
		const generate = (msg: string, p1: string, severity?: LintError.Severity) =>
			(arg: ImageParameterToken): LintError => {
				const e = generateForChild(
					arg,
					rect,
					'no-duplicate',
					Parser.msg(`${msg} image $1 parameter`, p1),
					severity,
				);
				e.suggestions = [{desc: 'remove', range: [e.startIndex - 1, e.endIndex], text: ''}];
				return e;
			};
		const {extension} = this;
		for (const key of keys) {
			if (key === 'invalid' || key === 'width' && unscaled) {
				continue;
			}
			let relevantArgs = args.filter(({name}) => name === key);
			if (key === 'caption') {
				relevantArgs = [
					...relevantArgs.slice(0, -1).filter(arg => arg.text()),
					...relevantArgs.slice(-1),
				];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(generate(
					'duplicated',
					key,
					key === 'caption' && extension && !extensions.has(extension) ? 'warning' : 'error',
				)));
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
	 */
	getFrame(): string | Title | undefined {
		const [arg] = this.getFrameArgs(),
			val = arg?.name;
		return val === 'manualthumb' ? this.normalizeTitle(arg!.getValue() as string, 6) : val;
	}

	/**
	 * Get the effective image horizontal alignment parameter value
	 *
	 * 获取生效的图片水平对齐参数
	 */
	getHorizAlign(): string | undefined {
		return this.getHorizAlignArgs()[0]?.name;
	}

	/**
	 * Get the effective image vertical alignment parameter value
	 *
	 * 获取生效的图片垂直对齐参数
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
			const {childNodes} = Parser
				.parse(value as string, this.getAttribute('include'), undefined, config);
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
			img = `<img${alt && ` alt="${alt}"`} src="${(manual ? fr : file).getUrl()}" class="mw-file-element"${
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
			return horiz || vert || visibleCaption
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
			parent?.parentNode?.getAttr('showfilename') === undefined
				? ''
				: `<a href="${file.getUrl()}" class="galleryfilename galleryfilename-truncate" title="${
					file.title
				}">${file.main}</a>\n`
		}${caption}</div>\n\t</li>`;
	}
}

classes['FileToken'] = __filename;
