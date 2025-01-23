import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {MagicLinkToken} from '../src/magicLink';

/* NOT FOR BROWSER */

export interface MagicLinkParentBase {

	/** 协议 */
	protocol: string | undefined;

	/** 和内链保持一致 */
	link: string;

	/** 获取网址 */
	getUrl(): URL;

	/**
	 * 设置链接目标
	 * @param url 网址
	 */
	setTarget(url: string): void;
}

/* NOT FOR BROWSER END */

/**
 * ExtLinkToken
 * @param constructor 基类
 * @param _ context
 */
export const magicLinkParent = <T extends AstConstructor>(constructor: T, _?: unknown) => {
	/** 子节点含有MagicLinkParent的类 */
	abstract class MagicLinkParent extends constructor {
		abstract get firstChild(): MagicLinkToken;

		/* NOT FOR BROWSER */

		/** @implements */
		get protocol(): string | undefined {
			return this.firstChild.protocol;
		}

		set protocol(value: string) {
			this.firstChild.protocol = value;
		}

		/** @implements */
		get link(): string {
			return this.firstChild.link;
		}

		set link(url) {
			this.firstChild.link = url;
		}

		/** @implements */
		getUrl(): URL {
			return this.firstChild.getUrl() as URL;
		}

		/** @implements */
		setTarget(url: string): void {
			this.firstChild.setTarget(url);
		}
	}
	mixin(MagicLinkParent, constructor);
	return MagicLinkParent;
};

mixins['magicLinkParent'] = __filename;
