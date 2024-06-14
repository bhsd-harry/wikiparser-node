import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {NoincludeToken} from './nowiki/noinclude';
import type {LintError} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|NoincludeToken|AstText)}`
 */
export abstract class GalleryToken extends Token {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (GalleryImageToken | NoincludeToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | NoincludeToken | AstText | undefined;
	abstract override get lastChild(): GalleryImageToken | NoincludeToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				// @ts-expect-error abstract class
				super.insertAt((line.trim() ? new NoincludeToken(line, config) : line) as string);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
			} else {
				// @ts-expect-error abstract class
				super.insertAt(new NoincludeToken(line, config) as NoincludeToken);
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(file: string): boolean {
		return this.normalizeTitle(file, 6, true, true).valid;
	}

	/** @private */
	override toString(): string {
		return super.toString('\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const {top, left} = this.getRootNode().posFromIndex(start)!,
			errors: LintError[] = [];
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				str = child.toString(),
				{length} = str,
				trimmed = str.trim(),
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'noinclude' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					rule: 'no-ignored',
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: trimmed.startsWith('|') ? 'warning' : 'error',
					startIndex: start,
					endIndex: start + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					suggestions: [
						{
							desc: 'remove',
							range: [start, start + length],
							text: '',
						},
						{
							desc: 'comment',
							range: [start, start + length],
							text: `<!--${str}-->`,
						},
					],
				});
			} else if (child.type !== 'noinclude' && child.type !== 'text') {
				errors.push(...child.lint(start, re));
			}
			start += length + 1;
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: '\n'});
	}
}
