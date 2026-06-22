import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {SingleLineToken} from './index';
import {ExtToken} from '../tagPair/ext';
import type {Config, LintError} from '../../base';
import type {Token, CharinsertToken, AstText} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {decodeHtml} from '../../util/string';
import {cached} from '../../mixin/cached';

/** @ignore */
const getInsertAttribute = (text: string): string =>
	decodeHtml(text.replaceAll(/&(?=(?:nbsp|#160);)/gu, '&amp;'));

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): ExtToken[];
	abstract override get firstElementChild(): ExtToken | undefined;
	abstract override get lastElementChild(): ExtToken | undefined;
	abstract override get parentElement(): CharinsertToken | undefined;
	abstract override get previousElementSibling(): CharinsertLineToken | undefined;
	abstract override get nextElementSibling(): CharinsertLineToken | undefined;

	/* NOT FOR BROWSER END */

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
			{AstText: ':', ExtToken: ':'},
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

	/* NOT FOR BROWSER ONLY */

	/** @private */
	override text(): string {
		const entities = {'\t': '&#9;', '\r': '&#12;', ' ': '&#32;'};
		return this.childNodes.map(
			child => child.type === 'text'
				? child.data
				: child.innerText!.replace(/[\t\r ]/gu, c => entities[c as '\t' | '\r' | ' ']),
		).join('').trim().replace(/\n+/gu, ' ');
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * Get all insertion items in this line
	 *
	 * 获取此行的所有插入项
	 */
	getItems(): [string, string?][] {
		const str = this.text();
		return str
			? str.split(/\s+/u).map(item => {
				const parts = item.split('+', 2) as [string, string?];
				if (parts.length === 1) {
					return parts;
				}
				return parts[0] ? parts : ['+'];
			})
			: [];
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const label = this.parentNode?.parentNode?.getAttr('label');
		return this.getItems().map(([start, end = '']) => {
			const estart = getInsertAttribute(start),
				eend = getInsertAttribute(end);
			return `<a data-mw-charinsert-start="${estart}" data-mw-charinsert-end="${
				eend
			}" class="mw-charinsert-item">${label ?? estart + eend}</a>`;
		}).join('\n');
	}
}

classes['CharinsertLineToken'] = __filename;
