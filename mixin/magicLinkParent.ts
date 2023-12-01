import {Shadow} from '../util/debug';
import type {MagicLinkToken} from '../src/magicLink';

/**
 * ExtLinkToken
 * @param constructor 基类
 */
export const magicLinkParent = <T extends AstConstructor>(constructor: T) => {
	/** 子节点含有MagicLinkParent的类 */
	abstract class MagicLinkParent extends constructor {
		abstract get firstChild(): MagicLinkToken;
		abstract get firstElementChild(): MagicLinkToken;

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

Shadow.mixins['magicLinkParent'] = __filename;
