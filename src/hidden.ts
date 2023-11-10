import {hidden} from '../mixin/hidden';
import {Parser} from '../index';
import {Token} from '.';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	/** @browser */
	override readonly type = 'hidden';

	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable?: Acceptable) {
		super(wikitext, config, true, accum, acceptable);
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new HiddenToken(undefined, config, [], acceptable) as this;
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes['HiddenToken'] = __filename;
