import {generateForChild, fixByRemove} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {parseCommentAndExt} from '../../parser/commentAndExt';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {clone} from '../../mixin/clone';
import {singleLine} from '../../mixin/singleLine';

/* NOT FOR BROWSER END */

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: AtomToken[]}`
 */
export abstract class ParamTagToken extends MultiLineToken {
	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): AtomToken[];
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;

	/* NOT FOR BROWSER END */

	/** @class */
	constructor(
		include: boolean,
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super(undefined, config, accum, {
			AtomToken: ':',
		});
		if (wikitext) {
			const SingleLineAtomToken = singleLine(!acceptable)(AtomToken);
			this.append(
				...wikitext.split('\n')
					.map(line => acceptable ? line : parseCommentAndExt(line, config, accum, include))
					.map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
						'Stage-1': ':', ...acceptable,
					})),
			);
		}
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const rule = 'no-ignored',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule, this.name);
			if (!s) {
				return [];
			}
			const rect = new BoundingRect(this, start),
				msg = Parser.msg('invalid-parameter', this.name),
				errors: LintError[] = [];
			for (const child of this.childNodes) {
				child.setAttribute('aIndex', start);
				const grandChildren = child.childNodes
					.filter(({type}) => type !== 'comment' && type !== 'include' && type !== 'noinclude');
				if (grandChildren.some(({type}) => type === 'ext')) {
					errors.push(generateForChild(child, rect, rule, msg, s));
				} else {
					const i = grandChildren.findIndex(({type}) => type !== 'text'),
						str = grandChildren.slice(0, i === -1 ? undefined : i).map(String).join('');
					if (str && !(i === -1 ? /^[a-z]+(?:\[\])?\s*=/iu : /^[a-z]+(?:\[\])?\s*(?:=|$)/iu).test(str)) {
						const e = generateForChild(child, rect, rule, msg, s);
						if (lintConfig.computeEditInfo) {
							e.suggestions = [fixByRemove(e)];
						}
						errors.push(e);
					} else {
						const childErrors = child.lint(start, false);
						if (childErrors.length > 0) {
							errors.push(...childErrors);
						}
					}
				}
				start += child.toString().length + 1;
			}
			return errors;
		}
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		const C = this.constructor as new (...args: any[]) => this;
		return new C(this.getAttribute('include'), undefined, this.getAttribute('config'));
	}
}

classes['ParamTagToken'] = __filename;
