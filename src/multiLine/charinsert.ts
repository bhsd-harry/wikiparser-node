import {numLeadingSpaces} from '@bhsd/common';
import {generateForChild, fixByRemove} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {CharinsertLineToken} from '../singleLine/charinsertLine';
import type {Config, LintError} from '../../base';
import type {Token} from '../../internal';

/**
 * `<charinsert>`
 * @classdesc `{childNodes: CharinsertLineToken[]}`
 */
export abstract class CharinsertToken extends MultiLineToken {
	declare readonly name: 'charinsert';

	declare readonly childNodes: readonly CharinsertLineToken[];
	abstract override get firstChild(): CharinsertLineToken | undefined;
	abstract override get lastChild(): CharinsertLineToken | undefined;

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
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
			const {name, childNodes, length: l} = this,
				rule = 'no-ignored',
				{lintConfig} = Parser,
				{computeEditInfo} = lintConfig,
				s = lintConfig.getSeverity(rule, name);
			if (!s) {
				return [];
			}
			const rect = new BoundingRect(this, start),
				msg = Parser.msg('invalid-space', name),
				leading: LintError[] = [],
				errors = super.lint(start);
			let begin = false;
			for (let i = l - 1; i >= 0; i--) {
				const child = childNodes[i]!,
					str = child.toString(),
					trimmed = str.trim();
				if (trimmed) {
					if (begin) {
						const [, {length}] = /(?:^|\S)(\s*)$/u.exec(str) as string[] as [string, string];
						if (length) {
							const e = generateForChild(child, rect, rule, msg, s);
							e.startIndex = e.endIndex - length;
							e.startCol = e.endCol - length;
							if (computeEditInfo) {
								e.fix = fixByRemove(e);
							}
							errors.push(e);
						}
					} else {
						begin = true;
					}
					if (leading.length > 0) {
						Array.prototype.push.apply(errors, leading);
						leading.length = 0;
					}
				}
				if (begin) {
					const n = numLeadingSpaces(str);
					if (n) {
						const e = generateForChild(child, rect, rule, msg, s);
						e.endIndex = e.startIndex + n;
						e.endCol = e.startCol + n;
						if (computeEditInfo) {
							e.fix = fixByRemove(e);
						}
						leading.push(e);
					}
				}
			}
			return errors;
		}
	}
}
