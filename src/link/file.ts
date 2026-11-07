import {

	/* NOT FOR BROWSER */

	MAX_STAGE,
} from '../../util/constants';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	Config,
} from '../../base';
import type {GalleryImageTypes} from '../imageParameter';
import type {
	Token,
	AtomToken,

	/* NOT FOR BROWSER */

	GalleryToken,
	ExtToken,
} from '../../internal';

/* NOT FOR BROWSER */

import {sanitizeAlt, sanitizeId} from '../../util/string';
import {Shadow} from '../../util/debug';
import {Title} from '../../lib/title';
import {cached} from '../../mixin/cached';
import {packedModes} from '../../render/extension';

/* NOT FOR BROWSER END */

const frame = new Map([
		['manualthumb', 'Thumb'],
		['frameless', 'Frameless'],
		['framed', 'Frame'],
		['thumbnail', 'Thumb'],
	]),
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
	let depth = 0,
		lastIndex = 0;
	for (let mt = regex.exec(str); mt; mt = regex.exec(str)) {
		const {0: match, index} = mt;
		if (match !== '|') {
			depth += match === '-{' ? 1 : -1;
		} else if (depth === 0) {
			exploded.push(str.slice(lastIndex, index));
			({lastIndex} = regex);
		}
	}
	exploded.push(str.slice(lastIndex));
	return exploded;
};

/* NOT FOR BROWSER */

/**
 * check if a string is an integer
 * @param n string to be checked
 */
const isInteger = (n: string | undefined): boolean => Boolean(n && !/\D/u.test(n));

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER END */

	override get type(): 'file' | GalleryImageTypes {
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

	/** image size / 图片大小 */
	get size(): {width: string, height: string} | undefined {
		const fr = this.getFrame();
		return fr === 'framed' || fr instanceof Title ? undefined : this.getArg('width')?.size;
	}

	/** image width / 图片宽度 */
	get width(): string | undefined {
		return this.is('gallery-image')
			? (this.parentNode as GalleryToken | undefined)?.widths.toString()
			: this.size?.width;
	}

	/** image height / 图片高度 */
	get height(): string | undefined {
		return this.is('gallery-image')
			? (this.parentNode as GalleryToken | undefined)?.heights.toString()
			: this.size?.height;
	}

	/**
	 * class attribute in string
	 *
	 * 以字符串表示的class属性
	 * @since v1.47.0
	 */
	get className(): string {
		return this.getValue('class') as string | undefined ?? '';
	}

	set className(className) {
		this.setValue('class', className || false);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 * @param type 图库节点类型
	 */
	constructor(
		link: string,
		text?: string,
		config?: Config,
		accum: Token[] = [],
		delimiter = '|',
		type?: GalleryImageTypes,
	) {
		super(link, undefined, config, accum, delimiter);

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});

		/* NOT FOR BROWSER END */

		const {extension} = this.getTitle(true, true);
		/-\{|\}-|\|/gu; // eslint-disable-line @typescript-eslint/no-unused-expressions
		this.safeAppend(explode(text).map(
			(part): ImageParameterToken =>
				// @ts-expect-error abstract class
				new ImageParameterToken(
					part,
					extension,
					type,
					config,
					accum,
				),
		));
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

	/* NOT FOR BROWSER */

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param keys 接受的参数名
	 */
	#getTypedArgs(keys: Set<string> | Map<string, string>): ImageParameterToken[] {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		return args;
	}

	/**
	 * Get image frame parameter tokens
	 *
	 * 获取图片框架属性参数节点
	 */
	getFrameArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(frame);
	}

	/**
	 * Get image horizontal alignment parameter tokens
	 *
	 * 获取图片水平对齐参数节点
	 */
	getHorizAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(horizAlign);
	}

	/**
	 * Get image vertical alignment parameter tokens
	 *
	 * 获取图片垂直对齐参数节点
	 */
	getVertAlignArgs(): ImageParameterToken[] {
		return this.#getTypedArgs(vertAlign);
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
	 * Set the image parameter
	 *
	 * 设置图片参数
	 * @param key parameter name / 参数名
	 * @param value parameter value / 参数值
	 * @throws `RangeError` if the parameter name is unknown
	 */
	setValue(key: 'class', value: string | false = false): void {
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
			syntax = Object.entries(config.img).find(([, name]) => name === key)?.[0];
		const free = syntax!.includes('$1');
		const parameter = Shadow.run(
			(): ImageParameterToken =>
				// @ts-expect-error abstract class
				new ImageParameterToken(
					syntax!.replace('$1', ''),
					this.extension,
					this.type,
					config,
				),
		);
		if (free) {
			parameter.safeReplaceChildren(Parser.parseWithRef(value, this, MAX_STAGE).childNodes);
		}
		this.insertAt(parameter);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		const {link, width, height, type, parentNode} = this,
			file = this.getAttribute('title'),
			fr = this.getFrame(),
			manual = fr instanceof Title,
			isThumb = manual || fr === 'thumbnail',
			framed = fr === 'framed',
			isGallery = type === 'gallery-image',
			visibleCaption = isThumb || framed || isGallery,
			caption = this.getArg('caption')?.toHtmlInternal({
				...opt,
				nowrap: true,
			}) ?? '',
			titleFromCaption = visibleCaption && !isGallery ? '' : sanitizeAlt(caption)!,
			hasLink = manual || link !== file,
			title = titleFromCaption || (hasLink && typeof link !== 'string' ? link.getTitleAttr() : ''),
			titleAttr = title && ` title="${title}"`,
			alt = sanitizeAlt(this.getArg('alt')?.toHtmlInternal({
				...opt,
				nowrap: true,
			})) ?? titleFromCaption,
			horiz = this.getHorizAlign() ?? '',
			vert = this.getVertAlign() ?? '',
			gallery = isGallery && parentNode?.parentNode as ExtToken | undefined,
			mode = gallery && gallery.getAttr('mode')?.toLowerCase(),
			nolines = mode === 'nolines',
			slideshow = mode === 'slideshow',
			packed = packedModes.has(mode as string),
			hasWidth = isInteger(width) && !packed,
			hasHeight = !nolines && !slideshow && isInteger(height),
			className = `${manual || framed || hasWidth || hasHeight ? '' : 'mw-default-size '}${
				horiz ? `mw-halign-${horiz}` : vert && `mw-valign-${vert}`
			}${this.getValue('border') ? ' mw-image-border' : ''} ${sanitizeAlt(this.className)}`.trim(),
			classAttr = className && ` class="${className}"`;
		let src: string;
		try {
			src = manual ? fr.getFileUrl() : file.getFileUrl(hasWidth && Number(width), hasHeight && Number(height));
		} catch {
			return '';
		}
		const img = `<img${alt || this.hasArg('alt') ? ` alt="${alt}"` : ''}${
			isThumb && hasLink ? ` resource="${file.getUrl()}"` : ''
		} src="${src}" decoding="async" loading="lazy"${
			hasWidth ? ` width="${width}"` : ''
		}${hasHeight ? ` height="${height}"` : ''} class="mw-file-element"${
			nolines || slideshow ? ` style="max-height: ${height}px"` : ''
		}>`;
		let href = '';
		if (link) {
			try {
				href = typeof link === 'string' ? this.getArg('link')!.getUrl()! : link.getUrl();
				if (link === file) {
					const lang = this.getValue('lang') as string | undefined,
						page = this.getValue('page') as string | undefined;
					if (lang) {
						href += `?lang=${sanitizeId(lang)}`;
					} else if (page) {
						href += `?page=${sanitizeId(page)}`;
					}
				}
			} catch {}
		}
		const a = link
			? `<a${href && ` href="${href}"`}${hasLink ? '' : ' class="mw-file-description"'}${titleAttr}${
				typeof link === 'string' ? ' rel="nofollow"' : ''
			}>${img}</a>`
			: `<span${titleAttr}>${img}</span>`;
		if (gallery === false) {
			return horiz || visibleCaption
				? `<figure${classAttr} typeof="mw:File${
					fr ? `/${manual ? 'Thumb' : frame.get(fr)}` : ''
				}">${a}<figcaption>${caption}</figcaption></figure>`
				: `<span${classAttr}>${a}</span>`;
		}
		const padding = nolines ? 0 : 30,
			overlay = packed && mode !== 'packed';
		return `\t\t<li class="gallerybox"${
			packed ? '' : ` style="width: ${Number(width) + padding + 5}px"`
		}>\n\t\t\t<div class="thumb"${
			packed
				? ''
				: ` style="width: ${Number(width) + padding}px;${
					nolines || slideshow ? '' : ` height: ${Number(height) + padding}px;`
				}"`
		}><span${classAttr}>${a}</span></div>\n\t\t\t${
			overlay ? '<div class="gallerytextwrapper">' : ''
		}<div class="gallerytext">${
			gallery?.hasAttr('showfilename')
				? `<a href="${file.getUrl()}" class="galleryfilename galleryfilename-truncate" title="${
					sanitizeId(file.title)
				}">${file.main}</a>\n`
				: ''
		}${caption}</div>${overlay ? '\n\t\t\t</div>' : ''}\n\t\t</li>`;
	}
}
