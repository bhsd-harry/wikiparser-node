import {fixByRemove, fixByComment} from '../../util/lint';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import {CommentLineToken} from '../nowiki/commentLine';
import type {
	Config,
	LintError,
} from '../../base';
import type {
	AstText,
	Token,
} from '../../internal';

/**
 * `<gallery>`
 * @classdesc `{childNodes: (GalleryImageToken|CommentLineToken|AstText)[]}`
 */
export abstract class GalleryToken extends MultiLineToken {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (GalleryImageToken | CommentLineToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | CommentLineToken | AstText | undefined;
	abstract override get lastChild(): GalleryImageToken | CommentLineToken | AstText | undefined;

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				// @ts-expect-error abstract class
				super.insertAt((line.trim() ? new CommentLineToken(line, config, accum) : line) as string);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
			} else {
				// @ts-expect-error abstract class
				super.insertAt(new CommentLineToken(line, config, accum) as CommentLineToken);
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(file: string): boolean {
		return this.normalizeTitle(
			file,
			6,
			{halfParsed: true, temporary: true, decode: true, page: ''},
		).valid;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const {top, left} = this.getRootNode().posFromIndex(start)!,
				errors: LintError[] = [],
				rule = 'no-ignored',
				{lintConfig} = Parser,
				s = ['Image', 'NoImage', 'Comment'].map(k => lintConfig.getSeverity(rule, `gallery${k}`));
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
}
