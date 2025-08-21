import {fixByRemove, fixByComment} from '../util/lint';
import {multiLine} from '../mixin/multiLine';
import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {NoincludeToken} from './nowiki/noinclude';
import type {
	Config,
	LintError,
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
		LINT: { // eslint-disable-line no-unused-labels
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
	}
}
