import {mixins} from '../util/constants';
import type {MagicLinkToken} from '../src/magicLink';

/* NOT FOR BROWSER */

export interface MagicLinkParentBase {
	protocol: string | undefined;
	link: string;
	getUrl(): URL;
	setTarget(url: string): void;
}

/* NOT FOR BROWSER END */

/**
 * ExtLinkToken
 * @param constructor 基类
 */
export const magicLinkParent = <T extends AstConstructor>(constructor: T) => {
	/** 子节点含有MagicLinkParent的类 */
	abstract class MagicLinkParent extends constructor {
		abstract get firstChild(): MagicLinkToken;
		abstract get firstElementChild(): MagicLinkToken;

		/* NOT FOR BROWSER */

		/** 协议 */
		get protocol(): string | undefined {
			return this.firstChild.protocol;
		}

		set protocol(value) {
			this.firstChild.protocol = value;
		}

		/** 和内链保持一致 */
		get link(): string {
			return this.firstChild.link;
		}

		set link(url) {
			this.firstChild.link = url;
		}

		/** 获取网址 */
		getUrl(): URL {
			return this.firstChild.getUrl();
		}

		/**
		 * 设置链接目标
		 * @param url 网址
		 */
		setTarget(url: string): void {
			this.firstChild.setTarget(url);
		}
	}
	return MagicLinkParent;
};

mixins['magicLinkParent'] = __filename;
