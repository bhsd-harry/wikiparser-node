import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {MagicLinkToken} from '../src/magicLink';

/* NOT FOR BROWSER */

export interface MagicLinkParentBase {

	/** URL protocol / 协议 */
	protocol: string | undefined;

	/** link / 链接 */
	link: string;

	/**
	 * Get the URL
	 *
	 * 获取网址
	 */
	getUrl(): URL;

	/**
	 * Set the target of the link
	 *
	 * 设置外链目标
	 * @param url URL containing the protocol / 含协议的网址
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
