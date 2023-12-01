import type {Token} from '../internal';

declare interface Shadow {
	/** @private */
	running: boolean;

	/** @private */
	classes: Record<string, string>;
	/** @private */
	mixins: Record<string, string>;
	/** @private */
	parsers: Record<string, string>;

	/** @private */
	readonly aliases: string[][];
	/** @private */
	readonly typeAliases: Record<string, string[] | undefined>;

	/** @private */
	readonly promises: Promise<void>[];

	/** @private */
	run<T>(callback: () => T): T;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Shadow: Shadow = {

	/* NOT FOR BROWSER */

	running: false,

	classes: {},
	mixins: {},
	parsers: {},

	aliases: [
		['AstText'],
		['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken'],
		['ArgToken', 'TranscludeToken', 'HeadingToken'],
		['HtmlToken'],
		['TableToken'],
		['HrToken', 'DoubleUnderscoreToken'],
		['LinkToken', 'FileToken', 'CategoryToken'],
		['QuoteToken'],
		['ExtLinkToken'],
		['MagicLinkToken'],
		['ListToken', 'DdToken'],
		['ConverterToken'],
	],
	typeAliases: {
		text: ['string', 'str'],
		plain: ['regular', 'normal'],
		// comment and extension
		onlyinclude: ['only-include'],
		noinclude: ['no-include'],
		include: ['includeonly', 'include-only'],
		comment: undefined,
		ext: ['extension'],
		'ext-attrs': ['extension-attrs', 'ext-attributes', 'extension-attributes'],
		'ext-attr-dirty': ['extension-attr-dirty', 'ext-attribute-dirty', 'extension-attribute-dirty'],
		'ext-attr': ['extension-attr', 'ext-attribute', 'extension-attribute'],
		'attr-key': ['attribute-key'],
		'attr-value': ['attribute-value', 'attr-val', 'attribute-val'],
		'ext-inner': ['extension-inner'],
		// triple braces
		arg: ['argument'],
		'arg-name': ['argument-name'],
		'arg-default': ['argument-default'],
		hidden: ['arg-redundant'],
		// double braces
		'magic-word': ['parser-function', 'parser-func'],
		'magic-word-name': ['parser-function-name', 'parser-func-name'],
		'invoke-function': ['invoke-func', 'lua-function', 'lua-func', 'module-function', 'module-func'],
		'invoke-module': ['lua-module'],
		template: undefined,
		'template-name': undefined,
		parameter: ['param'],
		'parameter-key': ['param-key'],
		'parameter-value': ['parameter-val', 'param-value', 'param-val'],
		// heading
		heading: ['header'],
		'heading-title': ['header-title'],
		'heading-trail': ['header-trail'],
		// html
		html: undefined,
		'html-attrs': ['html-attributes'],
		'html-attr-dirty': ['html-attribute-dirty'],
		'html-attr': ['html-attribute'],
		// table
		table: undefined,
		tr: ['table-row'],
		td: ['table-cell', 'table-data'],
		'table-syntax': undefined,
		'table-attrs': ['tr-attrs', 'td-attrs', 'table-attributes', 'tr-attributes', 'td-attributes'],
		'table-attr-dirty':
			['tr-attr-dirty', 'td-attr-dirty', 'table-attribute-dirty', 'tr-attribute-dirty', 'td-attribute-dirty'],
		'table-attr': ['tr-attr', 'td-attr', 'table-attribute', 'tr-attribute', 'td-attribute'],
		'table-inter': undefined,
		'td-inner': ['table-cell-inner', 'table-data-inner'],
		// hr and double-underscore
		hr: ['horizontal'],
		'double-underscore': ['underscore', 'behavior-switch', 'behaviour-switch'],
		// link
		link: ['wikilink'],
		'link-target': ['wikilink-target'],
		'link-text': ['wikilink-text'],
		category: ['category-link', 'cat', 'cat-link'],
		file: ['file-link', 'image', 'image-link', 'img', 'img-link'],
		'gallery-image': ['gallery-file', 'gallery-img'],
		'imagemap-image': ['imagemap-file', 'imagemap-img', 'image-map-image', 'image-map-file', 'image-map-img'],
		'image-parameter': ['img-parameter', 'image-param', 'img-param'],
		// quotes
		quote: ['quotes', 'quot', 'apostrophe', 'apostrophes', 'apos'],
		// external link
		'ext-link': ['external-link'],
		'ext-link-text': ['external-link-text'],
		'ext-link-url': ['external-link-url'],
		// magic link
		'free-ext-link': ['free-external-link', 'magic-link'],
		// list
		list: ['ol', 'ordered-list', 'ul', 'unordered-list', 'dl', 'description-list'],
		dd: ['indent', 'indentation'],
		// converter
		converter: ['convert', 'conversion'],
		'converter-flags': ['convert-flags', 'conversion-flags'],
		'converter-flag': ['convert-flag', 'conversion-flag'],
		'converter-rule': ['convert-rule', 'conversion-rule'],
		'converter-rule-noconvert': ['convert-rule-noconvert', 'conversion-rule-noconvert'],
		'converter-rule-variant': ['convert-rule-variant', 'conversion-rule-variant'],
		'converter-rule-to': ['convert-rule-to', 'conversion-rule-to'],
		'converter-rule-from': ['convert-rule-from', 'conversion-rule-from'],
		// specific extensions
		'param-line': ['parameter-line'],
		'imagemap-link': ['image-map-link'],
	},

	promises: [Promise.resolve()],

	/* NOT FOR BROWSER END */

	/** @implements */
	run(callback) {
		const {running} = this;
		this.running = true;
		try {
			const result = callback();
			this.running = running;
			return result;
		} catch (e) {
			this.running = running;
			throw e;
		}
	},
};

/* NOT FOR BROWSER */

/**
 * 撤销最近一次Mutation
 * @param e 事件
 * @param data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
export const undo = (e: AstEvent, data: AstEventData): void => {
	const {target, type} = e;
	switch (type) {
		case 'remove': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position!, 0, data.removed!);
			data.removed!.setAttribute('parentNode', target as Token);
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'insert': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position!, 1);
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'replace': {
			const {parentNode} = target,
				childNodes = [...parentNode!.childNodes];
			childNodes.splice(data.position!, 1, data.oldToken!);
			data.oldToken!.setAttribute('parentNode', parentNode);
			parentNode!.setAttribute('childNodes', childNodes);
			break;
		}
		case 'text':
			if (target.type === 'text') {
				target.replaceData(data.oldText!);
			}
			break;
		default:
			throw new RangeError(`无法撤销未知类型的事件：${String(type)}`);
	}
};
