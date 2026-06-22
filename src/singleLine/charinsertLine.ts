import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {SingleLineToken} from './index';
import {ExtToken} from '../tagPair/ext';
import type {Config, LintError} from '../../base';
import type {Token, CharinsertToken, AstText} from '../../internal';

/**
 * lines in `<charinsert>`
 *
 * `<charinsert>` 的行
 * @classdesc `{childNodes: (AstText | ExtToken)[]}`
 */
export abstract class CharinsertLineToken extends SingleLineToken {
	declare readonly childNodes: readonly (AstText | ExtToken)[];
	abstract override get firstChild(): AstText | ExtToken | undefined;
	abstract override get lastChild(): AstText | ExtToken | undefined;
	abstract override get parentNode(): CharinsertToken | undefined;
	abstract override get previousSibling(): CharinsertLineToken | undefined;
	abstract override get nextSibling(): CharinsertLineToken | undefined;

	override get type(): 'charinsert-line' {
		return 'charinsert-line';
	}

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[]) {
		super(
			wikitext?.replace(/<(nowiki)>(.*?)<\/(nowiki)>/giu, (_, opening, content, closing) => {
				// @ts-expect-error abstract class
				new ExtToken(opening, undefined, content, closing, config, false, accum);
				return `\0${accum.length - 2}e\x7F`;
			}),
			config,
			accum,
		);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				s = Parser.lintConfig.getSeverity(rule, 'charinsert');
			if (!s) {
				return [];
			}
			const errors: LintError[] = [],
				str = this.childNodes.map(
					child => child.type === 'text'
						? child.data
						: `<nowiki>${child.innerText!.replace(/[^+]/gu, '_')}</nowiki>`,
				).join(''),
				re = /(?:^|\s)\S+/gu,
				rect = new BoundingRect(this, start),
				msg = Parser.msg('invalid-content', 'charinsert');
			let mt = re.exec(str);
			while (mt) {
				const [item] = mt;
				let i = item.indexOf('+');
				if (i !== -1 && item.slice(0, i).trim()) {
					i = item.indexOf('+', i + 1);
				}
				if (i !== -1) {
					const e = generateForSelf(this, rect, rule, msg, s),
						startOffset = mt.index + i,
						endOffset = mt.index + item.length;
					e.endIndex = start + endOffset;
					e.endCol = e.startCol + endOffset;
					e.startIndex += startOffset;
					e.startCol += startOffset;
					errors.push(e);
				}
				mt = re.exec(str);
			}
			return errors;
		}
	}
}
