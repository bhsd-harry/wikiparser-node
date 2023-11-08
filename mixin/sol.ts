import * as Parser from '../index';
import Token = require('../src');

/**
 * 只能位于行首的类
 * @param constructor 基类
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sol = <T extends AstConstructor>(constructor: T) => {
	/** 只能位于行首的类 */
	abstract class SolToken extends constructor {
		/** 是否可以视为root节点 */
		#isRoot(): boolean {
			const {parentNode, type} = this as unknown as Token;
			return parentNode?.type === 'root'
				|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem';
		}

		/** 在前方插入newline */
		prependNewLine(): string {
			const {previousVisibleSibling} = this as unknown as Token;
			return (previousVisibleSibling ?? !this.#isRoot()) && !String(previousVisibleSibling).endsWith('\n')
				? '\n'
				: '';
		}

		/** @override */
		override toString(selector?: string): string {
			return selector && (this as unknown as Token).matches(selector)
				? ''
				: `${this.prependNewLine()}${super.toString(selector)}`;
		}

		/** @override */
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
export = sol;
