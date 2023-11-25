import * as Parser from '../index';
import type {Token} from '../src';

/**
 * 只能位于行首的类
 * @param constructor 基类
 */
export const sol = <T extends AstConstructor>(constructor: T) => {
	/** 只能位于行首的类 */
	abstract class SolToken extends constructor {
		/** 在前方插入newline */
		prependNewLine(): string {
			const {previousVisibleSibling, parentNode, type} = this as unknown as Token;
			if (previousVisibleSibling) {
				return String(previousVisibleSibling).endsWith('\n') ? '' : '\n';
			}
			return parentNode?.type === 'root'
				|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem'
				? ''
				: '\n';
		}

		/** @private */
		override toString(omit?: Set<string>): string {
			return omit && (this as unknown as Token).matchesTypes(omit)
				? ''
				: `${this.prependNewLine()}${super.toString(omit)}`;
		}

		/** @private */
		getPadding(): number {
			return this.prependNewLine().length;
		}

		/** @override */
		override text(): string {
			return `${this.prependNewLine()}${super.text()}`;
		}
	}
	return SolToken;
};

Parser.mixins['sol'] = __filename;
