import Parser from '../index';
import {Token} from '.';
import {GalleryImageToken} from './link/galleryImage';
import {HiddenToken} from './hidden';
import type {LintError} from '../index';
import type {AstText, AttributesToken, ExtToken} from '../internal';

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
export abstract class GalleryToken extends Token {
	/** @browser */
	override readonly type = 'ext-inner';
	declare name: 'gallery';
	declare childNodes: (GalleryImageToken | HiddenToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	abstract override get lastChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/**
	 * @browser
	 * @param inner 标签内部wikitext
	 */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				super.insertAt((line.trim()
					? new HiddenToken(line, config, [], {
					})
					: line) as string);
				continue;
			}
			const [, file, alt] = matches,
				title = this.normalizeTitle(file, 6, true, true);
			if (title.valid) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum));
			} else {
				super.insertAt(new HiddenToken(line, config, [], {
				}));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {top, left} = this.getRootNode().posFromIndex(start)!,
			errors: LintError[] = [];
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				str = String(child),
				{length} = str,
				trimmed = str.trim(),
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: 'error',
					startIndex: start,
					endIndex: start + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: String(child).slice(0, 50),
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(start));
			}
			start += length + 1;
		}
		return errors;
	}
}
