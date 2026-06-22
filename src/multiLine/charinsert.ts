import {numLeadingSpaces} from '@bhsd/common';
import {generateForChild, fixByRemove} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {CharinsertLineToken} from '../singleLine/charinsertLine';
import type {Config, LintError} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER ONLY */

import {text} from '../../util/string';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {html} from '../../util/html';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * `<charinsert>`
 * @classdesc `{childNodes: CharinsertLineToken[]}`
 */
export abstract class CharinsertToken extends MultiLineToken {
	declare readonly name: 'charinsert';

	declare readonly childNodes: readonly CharinsertLineToken[];
	abstract override get firstChild(): CharinsertLineToken | undefined;
	abstract override get lastChild(): CharinsertLineToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): CharinsertLineToken[];
	abstract override get firstElementChild(): CharinsertLineToken | undefined;
	abstract override get lastElementChild(): CharinsertLineToken | undefined;

	/* NOT FOR BROWSER END */

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			SingleLineToken: ':',
		});
		if (wikitext) {
			this.safeAppend(
				wikitext.split('\n')
					// @ts-expect-error abstract class
					.map((line): CharinsertLineToken => new CharinsertLineToken(line, config, accum)),
			);
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const {name, childNodes} = this,
				rule = 'no-ignored',
				{lintConfig} = Parser,
				{computeEditInfo} = lintConfig,
				s = lintConfig.getSeverity(rule, name);
			if (!s) {
				return [];
			}
			const rect = new BoundingRect(this, start),
				msg = Parser.msg('invalid-space', name),
				trailing: LintError[] = [];
			let errors = super.lint(start),
				begin = false;
			for (const child of childNodes) {
				const str = String(child),
					trimmed = str.trim();
				if (trimmed) {
					if (begin) {
						const n = numLeadingSpaces(str);
						if (n) {
							const e = generateForChild(child, rect, rule, msg, s);
							e.endIndex = e.startIndex + n;
							e.endCol = e.startCol + n;
							if (computeEditInfo) {
								e.fix = fixByRemove(e);
							}
							errors.push(e);
						}
					} else {
						begin = true;
					}
					if (trailing.length > 0) {
						errors = [...errors, ...trailing];
						trailing.length = 0;
					}
				}
				if (begin) {
					const [, {length}] = /(?:^|\S)(\s*)$/u.exec(str) as string[] as [string, string];
					if (length) {
						const e = generateForChild(child, rect, rule, msg, s);
						e.startIndex = e.endIndex - length;
						e.startCol = e.endCol - length;
						if (computeEditInfo) {
							e.fix = fixByRemove(e);
						}
						trailing.push(e);
					}
				}
			}
			return errors;
		}
	}

	/* NOT FOR BROWSER ONLY */

	/** @private */
	override text(): string {
		return text(this.childNodes, '\n').trim();
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * Get all insertion items
	 *
	 * 获取所有插入项
	 */
	getItems(): [string, string?][] {
		return this.childNodes.flatMap(child => child.getItems());
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		return html(this.childNodes, '<br>')
			.replaceAll(/^(?:<br>)+|(?<!<br>)(?:<br>)+$/gu, '');
	}
}

classes['CharinsertToken'] = __filename;
