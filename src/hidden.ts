import {hidden} from '../mixin/hidden';
import * as Parser from '../index';
import {Token} from './index';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	/** @browser */
	override readonly type = 'hidden';

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
