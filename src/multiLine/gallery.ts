import {fixByRemove, fixByComment} from '../../util/lint';
import {removeComment} from '../../util/string';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import {CommentLineToken} from '../nowiki/commentLine';
import {CommentToken} from '../nowiki/comment';
import type {
	Config,
	LintError,
	AST,
} from '../../base';
import type {
	AstText,
	Token,
} from '../../internal';

declare type Child = GalleryImageToken
	| CommentLineToken
	;

/**
 * `<gallery>`
 * @classdesc `{childNodes: (GalleryImageToken|CommentLineToken|AstText)[]}`
 */
export abstract class GalleryToken extends MultiLineToken {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (AstText | Child)[];
	abstract override get firstChild(): AstText | Child | undefined;
	abstract override get lastChild(): AstText | Child | undefined;

	/* PRINT ONLY */

	/**
	 * image widths
	 *
	 * 图片宽度
	 * @since v1.12.5
	 */
	get widths(): number {
		LSP: return this.#getSize('widths');
	}

	/**
	 * image heights
	 *
	 * 图片高度
	 * @since v1.12.5
	 */
	get heights(): number {
		LSP: return this.#getSize('heights');
	}

	/* PRINT ONLY END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		if (inner) {
			for (let line of inner.split('\n')) {
				line = line.replace(/<!--(.*?)-->/gu, (_, p1) => {
					// @ts-expect-error abstract class
					new CommentToken(p1, true, config, accum);
					return `\0${accum.length}c\x7F`;
				});
				const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
				if (!matches) {
					super.insertAt(
						(
							line.trim()
								// @ts-expect-error abstract class
								? new CommentLineToken(
									line,
									config,
									accum,
								)
								: line
						) as string,
					);
					continue;
				}
				const [, file, alt] = matches;
				if (this.#checkFile(file, true)) { // eslint-disable-line unicorn/prefer-ternary
					// @ts-expect-error abstract class
					super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
				} else {
					super.insertAt(
						// @ts-expect-error abstract class
						new CommentLineToken(
							line,
							config,
							accum,
						) as CommentLineToken,
					);
				}
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 * @param parsing 是否在解析过程中
	 */
	#checkFile(file: string, parsing?: boolean): boolean {
		return this.normalizeTitle(
			parsing ? removeComment(file) : file,
			6,
			{halfParsed: true, temporary: true, decode: true, page: ''},
		).valid;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const {length: l, childNodes, name} = this,
				{top, left} = this.getRootNode().posFromIndex(start)!,
				errors: LintError[] = [],
				message = Parser.msg('invalid-content', name),
				rule = 'no-ignored',
				{lintConfig} = Parser,
				s = ['Image', 'NoImage', 'Comment'].map(k => lintConfig.getSeverity(rule, `gallery${k}`));
			for (let i = 0; i < l; i++) {
				const child = childNodes[i]!,
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
								message,
								severity,
								startIndex: start,
								endIndex,
								startLine,
								endLine: startLine,
								startCol,
								endCol: startCol + length,
							};
						if (lintConfig.computeEditInfo) {
							e.suggestions = [
								fixByRemove(e),
								fixByComment(e, str),
							];
						}
						errors.push(e);
					}
				} else if (type !== 'noinclude' && type !== 'text') {
					const childErrors = child.lint(start, re);
					if (childErrors.length > 0) {
						Array.prototype.push.apply(errors, childErrors);
					}
				}
				start += length + 1;
			}
			return errors;
		}
	}

	/* PRINT ONLY */

	/**
	 * 获取图片的宽度或高度
	 * @param key `widths` 或 `heights`
	 */
	#getSize(key: 'widths' | 'heights'): number {
		LSP: {
			const widths = this.parentNode?.getAttr(key),
				mt = widths && /^(\d+)\s*(?:px)?$/u.exec(widths)?.[1];
			return mt && Number(mt) || 120;
		}
	}

	/** @private */
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start);
			Object.assign(json, {widths: this.widths, heights: this.heights});
			return json;
		}
	}
}
