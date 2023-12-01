import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {hidden} from '../mixin/hidden';
import {Token} from './index';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	override readonly type = 'hidden';

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Shadow.run(() => {
			const token = new HiddenToken(undefined, config, [], acceptable) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['HiddenToken'] = __filename;
