import {NowikiBaseToken} from './base';
import type {
	AstNodes,
	AttributesToken,
	ExtToken,
} from '../../internal';

/**
 * text-only token inside an extension tag
 *
 * 扩展标签内的纯文字Token
 */
export abstract class NowikiToken extends NowikiBaseToken {
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @private */
	override safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		if (elements.length === 0) {
			this.setText('');
		} else {
			super.safeReplaceChildren(elements);
		}
	}
}
