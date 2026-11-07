import {getRegex} from '@bhsd/common';
import {
	extUrlChar,
	extUrlCharFirst,
	removeComment,
	text,
} from '../util/string';
import {
	MAX_STAGE,
	galleryParams,
} from '../util/constants';
import {Shadow} from '../util/debug';
import Parser from '../index';
import {Token} from './index';
import type {Config, TokenTypes} from '../base';
import type {Title} from '../lib/title';
import type {
	AtomToken,
	FileToken,

	/* NOT FOR BROWSER */

	AstText,
} from '../internal';

export type GalleryImageTypes = 'gallery-image';

/^(?:ftp:\/\/|\/\/|\0\d+m\x7F)/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
const getUrlLikeRegex = getRegex(protocol => new RegExp(String.raw`^(?:${protocol}|//|\0\d+m\x7F)`, 'iu'));
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(?:(?:ftp:\/\/|\/\/)(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])|\0\d+m\x7F)[^[\]<>"\0\t\n\p{Zs}]*$/iu;
const getUrlRegex = getRegex(
	protocol => new RegExp(String.raw`^(?:(?:${protocol}|//)${extUrlCharFirst}|\0\d+m\x7F)${extUrlChar}$`, 'iu'),
);
/* eslint-disable @typescript-eslint/no-unused-expressions */
/^(\s*)link=(.*)(?=$|\n)(\s*)$/u;
/^(\s*(?!\s))(.*)px(\s*)$/u;
/* eslint-enable @typescript-eslint/no-unused-expressions */
const getSyntaxRegex = getRegex(syntax => new RegExp(
	String.raw`^(\s*(?!\s))${syntax.replace('$1', '(.*)')}${
		syntax.endsWith('$1') ? '(?=$|\n)' : ''
	}(\s*)$`,
	'u',
));

/**
 * 获取网址
 * @param link 外链
 */
const getUrl = (link: string): string => {
	if (!link) {
		return link;
	} else if (link.startsWith('//')) {
		link = `https:${link}`;
	}
	return new URL(link).href;
};

const pdfExtensions = new Set<string | undefined>(['djvu', 'djv', 'pdf']);

/**
 * 检查图片参数是否合法
 * @param key 参数名
 * @param val 参数值
 * @param config
 * @param ext 文件扩展名
 * @param halfParsed
 */
function validate(key: string, val: string, config: Config, ext: string | undefined, halfParsed: boolean): boolean;
function validate(
	key: 'link',
	val: string,
	config: Config,
	type?: TokenTypes,
	halfParsed?: boolean,
	accum?: Token[],
): string | Title | boolean;
function validate(
	key: string,
	val: string,
	config: Config,
	extOrType?: string,
	halfParsed?: boolean,
	accum?: Token[],
): string | Title | boolean {
	val = removeComment(val).trim();
	const value = val.replace(key === 'link' ? /\0\d+[tq]\x7F/gu : /\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return !value && Boolean(val) || /^(?:\d+x?|\d*x\d+)(?:\s*px)?$/u.test(value);
		case 'link': {
			const isGalleryImage = extOrType === 'gallery-image';
			if (!value) {
				return val;
			} else if (getUrlLikeRegex(config.protocol).test(value)) {
				return getUrlRegex(config.protocol).test(value) ? val : isGalleryImage;
			}
			const title = Parser.normalizeTitle(
				value,
				0,
				false,
				config,
				{halfParsed, decode: true, selfLink: true, page: '', nowiki: true},
				accum,
			);
			return title.valid ? title : isGalleryImage;
		}
		case 'lang':
			return (extOrType === 'svg' || extOrType === 'svgz') && !/[^a-z\d-]/u.test(value);
		case 'alt':
		case 'class':
		case 'manualthumb':
			return true;
		case 'page':
			return pdfExtensions.has(extOrType) && Number(value) > 0;
		default:
			return Boolean(value) && !isNaN(value as unknown as number);
	}
}

/**
 * image parameter
 *
 * 图片参数
 */
export abstract class ImageParameterToken extends Token {
	declare readonly name: string;
	readonly #syntax: string = '';

	/* NOT FOR BROWSER */

	readonly #extension;

	/* NOT FOR BROWSER END */

	abstract override get parentNode(): FileToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	override get type(): 'image-parameter' {
		return 'image-parameter';
	}

	/**
	 * thumbnail
	 *
	 * 缩略图
	 * @since v1.29.0
	 */
	get thumb(): Title | undefined {
		return this.name === 'manualthumb'
			? this.normalizeTitle(`File:${super.text().trim()}`, 6, {page: ''})
			: undefined;
	}

	/** image link / 图片链接 */
	get link(): string | Title | undefined {
		const {name, parentNode, childNodes} = this;
		if (name !== 'link') {
			return undefined;
		}
		const value = text(
			childNodes.flatMap(child => child.is('link') ? child.lastChild.childNodes : child)
				.filter(({type}) => type !== 'html'),
		).trim();
		return Shadow.run((): string | Title | undefined => {
			const config = this.getAttribute('config'),
				accum: Token[] = [],
				token = new Token(value, config, accum);
			token.parseOnce(0, this.getAttribute('include')).parseOnce();
			if (/^\0\d+m\x7F/u.test(token.firstChild!.toString())) {
				return value;
			}
			const link = validate('link', value, config, parentNode?.type, undefined, accum);
			return typeof link === 'boolean' ? undefined : link;
		}, Parser);
	}

	/* NOT FOR BROWSER */

	/** iamge size / 图片大小 */
	get size(): {width: string, height: string} | undefined {
		const size = (this.getValue() as string).replace(/px$/u, '').trim();
		if (!size.includes('{{')) {
			const [width, height = ''] = size.split('x') as [string, string?];
			return {width, height};
		}
		const token = Parser.parseWithRef(size, this, 2, false),
			i = token.childNodes.findIndex(
				({type, data}) => type === 'text' && data.includes('x'),
			);
		if (i === -1) {
			return {width: size, height: ''};
		}
		const str = token.childNodes[i] as AstText;
		str.splitText(str.data.indexOf('x')).splitText(1);
		return {
			width: text(token.childNodes.slice(0, i + 1)),
			height: text(token.childNodes.slice(i + 2)),
		};
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param str 图片参数
	 * @param extension 文件扩展名
	 * @param type 图库节点类型
	 */
	constructor(
		str: string,
		extension: string | undefined,
		type: GalleryImageTypes | undefined,
		config: Config,
		accum?: Token[],
	) {
		let mt: [string, string, string, string?] | null;
		const regexes = Object.entries(config.img)
				.map(([syntax, param]) => [syntax, param, getSyntaxRegex(syntax)] as const),
			param = regexes.find(([, key, regex]) => {
				mt = regex.exec(str) as [string, string, string, string?] | null;
				return mt
					&& (
						mt.length !== 4
						|| validate(
							key as 'link',
							mt[2],
							config,
							key === 'link' ? type : extension as GalleryImageTypes | undefined,
							true,
							accum,
						) !== false
					);
			});
		// @ts-expect-error mt already assigned
		if (param && mt) {
			if (mt.length === 3) {
				super(undefined, config, accum);
				this.#syntax = str;
			} else {
				super(mt[2], config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				this.#syntax = mt[1] + param[0] + mt[3]!;
			}
			this.setAttribute('name', param[1]);
			if (param[1] === 'alt') {
				this.setAttribute('stage', MAX_STAGE - 1);
			}
			return;
		}
		super(
			str,
			config.excludes.includes('list')
				? config
				: {
					...config,
					excludes: [...config.excludes, 'list'],
				},
			accum,
		);
		this.setAttribute('name', 'caption');
		this.setAttribute('stage', 7);

		/* NOT FOR BROWSER */

		this.#extension = extension;
	}

	/** @private */
	override afterBuild(): void {
		if (this.parentNode?.is('gallery-image') && !galleryParams.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		const str = super.toString(skip);
		return this.#syntax ? this.#syntax.replace('$1', () => str) : str;
	}

	/** @private */
	override text(): string {
		const {name} = this;
		if (name === 'invalid') {
			return '';
		}
		let str = super.text();
		if (name !== 'caption') {
			str = str.trim();
		}
		return this.#syntax ? this.#syntax.replace('$1', () => str).trim() : str;
	}

	/** @private */
	override isPlain(): boolean {
		return this.name === 'caption' || this.name === 'alt';
	}

	/** 是否是不可变参数 */
	#isVoid(): '' | boolean {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string | true {
		const {name, childNodes} = this;
		if (name === 'link') {
			return text(childNodes.map(
				child => child.is('ext') && child.name === 'nowiki' ? child.innerText ?? '' : child,
			)).trim();
		} else if (name === 'invalid') {
			return '';
		}
		return name === 'caption' ? super.text() : this.#isVoid() || super.text().trim();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ImageParameterToken(
				this.#syntax.replace('$1', '1'),
				this.#extension,
				this.parentNode?.type,
				this.getAttribute('config'),
			);
			token.safeReplaceChildren(cloned);
			return token;
		});
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param value parameter value / 参数值
	 * @throws `Error` if the parameter is invalid
	 */
	setValue(value: string): void {
		this.safeReplaceChildren(Parser.parseWithRef(value, this, 5).childNodes);
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 * @param articlePath article path / 条目路径
	 * @since v1.11.0
	 */
	getUrl(articlePath?: string): string | undefined {
		const {link} = this;
		if (!link) {
			return link;
		}
		return typeof link === 'string' ? getUrl(link) : link.getUrl(articlePath);
	}
}
