import {mixin} from '../util/debug';
import {mixins} from '../util/constants';

/**
 * 不可包含换行符的类
 * @param strict 是否严格
 */
export const singleLine = (strict = true) => <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 不可包含换行符的类 */
	abstract class SingleLineToken extends constructor {
		override toString(skip?: boolean): string {
			if (strict) {
				return super.toString(skip).replaceAll('\n', ' ');
			}
			// InputboxToken
			return this.childNodes.map(child => {
				const str = child.toString(skip),
					{type} = child;
				return type === 'comment' || type === 'include' || type === 'ext'
					? str
					: str.replaceAll('\n', ' ');
			}).join('');
		}

		override text(): string {
			return super.text().replaceAll('\n', ' ');
		}
	}
	mixin(SingleLineToken, constructor);
	return SingleLineToken;
};

mixins['singleLine'] = __filename;
