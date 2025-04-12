import {padded} from '../mixin/padded';
import {Token} from './index';

/**
 * `<onlyinclude>` during transclusion
 *
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: (AstText|Token)[]}`
 */
@padded('<onlyinclude>')
export class OnlyincludeToken extends Token {
	override get type(): 'onlyinclude' {
		return 'onlyinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<onlyinclude>${super.toString(skip)}</onlyinclude>`;
	}

	/** @private */
	override isPlain(): true {
		return true;
	}
}
