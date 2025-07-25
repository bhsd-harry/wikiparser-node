import {generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {parseCommentAndExt} from '../../parser/commentAndExt';
import {multiLine} from '../../mixin/multiLine';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {clone} from '../../mixin/clone';
import {singleLine} from '../../mixin/singleLine';

/* NOT FOR BROWSER END */

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: AtomToken[]}`
 */
@multiLine
export abstract class ParamTagToken extends Token {
	declare readonly name: string;

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): AtomToken[];
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(
		include: boolean,
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
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
		const rule = 'no-ignored',
			s = Parser.lintConfig.getSeverity(rule, this.name);
		if (!s) {
			return [];
		}
		const rect = new BoundingRect(this, start),
			msg = Parser.msg('invalid parameter of <$1>', this.name),
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
					e.suggestions = [{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''}];
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

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		const C = this.constructor as new (...args: any[]) => this;
		return new C(this.getAttribute('include'), undefined, this.getAttribute('config'));
	}
}

classes['ParamTagToken'] = __filename;
