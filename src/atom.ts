import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';

declare type AtomTypes = 'arg-name'
| 'attr-key'
| 'attr-value'
| 'ext-attr-dirty'
| 'html-attr-dirty'
| 'table-attr-dirty'
| 'converter-flag'
| 'converter-rule-variant'
| 'converter-rule-to'
| 'converter-rule-from'
| 'invoke-function'
| 'invoke-module'
| 'template-name'
| 'link-target'
| 'param-line';

/** 不会被继续解析的plain Token */
export class AtomToken extends Token {
	declare type: AtomTypes;

	/** @class */
	constructor(
		wikitext: string | undefined,
		type: AtomTypes,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.type = type;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Shadow.run(() => {
			const token = new AtomToken(undefined, this.type, config, [], acceptable) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['AtomToken'] = __filename;
