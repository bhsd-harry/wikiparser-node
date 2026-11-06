import {padded} from '../../mixin/padded';
import {LinkBaseToken} from './base';
import type {Config} from '../../base';
import type {Title} from '../../lib/title';
import type {
	Token,
	AtomToken,
	AttributesToken,
	ExtToken,

	/* NOT FOR BROWSER */

	AstNodes,
} from '../../internal';

/**
 * `<categorytree>`
 * @classdesc `{childNodes: [AtomToken]}`
 */
@padded('')
export abstract class CategorytreeToken extends LinkBaseToken {
	declare readonly name: 'categorytree';

	declare readonly childNodes: readonly [AtomToken];
	abstract override get lastChild(): AtomToken;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken];
	abstract override get previousElementSibling(): AttributesToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @param link 链接标题 */
	constructor(link: string, linkText?: undefined, config?: Config, accum: Token[] = []) {
		super(link, linkText, config, accum);
		this.setAttribute('bracket', false);

		/* NOT FOR BROWSER */

		// @ts-expect-error abstract getter override
		this.firstChild.setAttribute('acceptable', {AstText: 0});
	}

	/** @private */
	override getTitle(): Title {
		const target = this.firstChild.toString().trim(),
			opt = {halfParsed: true},
			title = this.normalizeTitle(target, 14, opt);
		return title.valid && title.ns === 14
			&& !title.interwiki
			? title
			: this.normalizeTitle(`Category:${target}`, 0, opt);
	}

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlInternal(): string {
		return '';
	}

	/** @private */
	override safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		if (elements.length === 0) {
			this.firstChild.replaceChildren();
		} else {
			super.safeReplaceChildren(elements);
		}
	}
}
