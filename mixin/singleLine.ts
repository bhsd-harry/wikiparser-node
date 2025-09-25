import {mixin} from '../util/debug';
import {mixins} from '../util/constants';

/**
 * 不可包含换行符的类
 * @ignore
 */
export const singleLine = <T extends AstConstructor>(constructor: T): T => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class SingleLineToken extends constructor {
		override toString(skip?: boolean): string {
			if (this.parentNode?.name === 'inputbox') {
				return this.childNodes.map(child => {
					const str = child.toString(skip),
						{type} = child;
					return type === 'comment' || type === 'include' || type === 'ext'
						? str
						: str.replaceAll('\n', ' ');
				}).join('');
			}
			return super.toString(skip).replaceAll('\n', ' ');
		}

		override text(): string {
			return super.text().replaceAll('\n', ' ');
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(SingleLineToken, constructor);
	return SingleLineToken;
};

mixins['singleLine'] = __filename;
