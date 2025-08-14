import {fixByRemove, fixByComment} from '../util/lint';
import {multiLine} from '../mixin/multiLine';
import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {NoincludeToken} from './nowiki/noinclude';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

declare type Child = GalleryImageToken | NoincludeToken;

/**
 * gallery tag
 *
 * gallery标签
 * @classdesc `{childNodes: (GalleryImageToken|NoincludeToken|AstText)[]}`
 */
@multiLine
export abstract class GalleryToken extends Token {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (Child | AstText)[];
	abstract override get firstChild(): Child | AstText | undefined;
	abstract override get lastChild(): Child | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/* PRINT ONLY */

	/**
	 * image widths
	 *
	 * 图片宽度
	 * @since v1.12.5
	 */
	get widths(): number {
		return this.#getSize('widths');
	}

	/**
	 * image heights
	 *
	 * 图片高度
	 * @since v1.12.5
	 */
	get heights(): number {
		return this.#getSize('heights');
	}

	/* PRINT ONLY END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				// @ts-expect-error abstract class
				super.insertAt((line.trim() ? new NoincludeToken(line, config, accum) : line) as string);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
			} else {
				// @ts-expect-error abstract class
				super.insertAt(new NoincludeToken(line, config, accum) as NoincludeToken);
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(file: string): boolean {
		return this.normalizeTitle(file, 6, {halfParsed: true, temporary: true, decode: true}).valid;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const {top, left} = this.getRootNode().posFromIndex(start)!,
			errors: LintError[] = [],
			rule = 'no-ignored',
			s = ['Image', 'NoImage', 'Comment'].map(k => Parser.lintConfig.getSeverity(rule, `gallery${k}`));
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				str = child.toString(),
				{length} = str,
				trimmed = str.trim(),
				{type} = child,
				startLine = top + i,
				startCol = i ? 0 : left;
			child.setAttribute('aIndex', start);
			if (type === 'noinclude' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				let [severity] = s;
				if (trimmed.startsWith('|')) {
					[, severity] = s;
				} else if (trimmed.startsWith('<!--') || trimmed.endsWith('-->')) {
					[,, severity] = s;
				}
				if (severity) {
					const endIndex = start + length,
						e: LintError = {
							rule,
							message: Parser.msg('invalid-content', 'gallery'),
							severity,
							startIndex: start,
							endIndex,
							startLine,
							endLine: startLine,
							startCol,
							endCol: startCol + length,
						};
					e.suggestions = [
						fixByRemove(e),
						fixByComment(e, str),
					];
					errors.push(e);
				}
			} else if (type !== 'noinclude' && type !== 'text') {
				const childErrors = child.lint(start, re);
				if (childErrors.length > 0) {
					errors.push(...childErrors);
				}
			}
			start += length + 1;
		}
		return errors;
	}

	/* PRINT ONLY */

	/**
	 * 获取图片的宽度或高度
	 * @param key `widths` 或 `heights`
	 */
	#getSize(key: 'widths' | 'heights'): number {
		const widths = this.parentNode?.getAttr(key),
			mt = typeof widths === 'string' && /^(\d+)\s*(?:px)?$/u.exec(widths)?.[1];
		return mt && Number(mt) || 120;
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		Object.assign(json, {widths: this.widths, heights: this.heights});
		return json;
	}
}
