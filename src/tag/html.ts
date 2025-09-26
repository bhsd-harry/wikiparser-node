import {generateForSelf, fixByRemove, fixByClose, fixByOpen} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {TagToken} from './index';
import type {
	Config,
	LintError,
} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';
import type {Token, AttributesToken, TranscludeToken} from '../../internal';

export interface HtmlToken extends AttributesParentBase {}

const magicWords = new Set<string | undefined>(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']),
	formattingTags = new Set([
		'b',
		'big',
		'center',
		'cite',
		'code',
		'del',
		'dfn',
		'em',
		'font',
		'i',
		'ins',
		'kbd',
		'mark',
		'pre',
		'q',
		's',
		'samp',
		'small',
		'strike',
		'strong',
		'sub',
		'sup',
		'tt',
		'u',
		'var',
	]),
	obsoleteTags = new Set(['strike', 'big', 'center', 'font', 'tt']);

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@attributesParent()
export abstract class HtmlToken extends TagToken {
	declare readonly name: string;
	#selfClosing;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	override get type(): 'html' {
		return 'html';
	}

	/** whether to be self-closing / 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/** @private */
	override get closing(): boolean {
		return super.closing;
	}

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 * @param selfClosing 是否自封闭
	 */
	constructor(
		name: string,
		attr: AttributesToken,
		closing: boolean,
		selfClosing: boolean,
		config?: Config,
		accum?: Token[],
	) {
		super(name, attr, closing, config, accum);
		this.setAttribute('name', name.toLowerCase());
		this.#selfClosing = selfClosing;
	}

	/** @private */
	override text(): string {
		const {closing, selfClosing, name} = this,
			{html: [,, voidTags]} = this.getAttribute('config');
		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : super.text('/');
		}
		return super.text(selfClosing && !closing ? '/' : '');
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{name, parentNode, closing, selfClosing} = this,
				rect = new BoundingRect(this, start),
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				severity = this.inTableAttrs();
			let rule: LintError.Rule = 'h1',
				s = lintConfig.getSeverity(rule, 'html');
			if (s && name === 'h1' && !closing) {
				const e = generateForSelf(this, rect, rule, '<h1>', s);
				if (computeEditInfo) {
					e.suggestions = [{desc: 'h2', range: [start + 2, start + 3], text: '2'}];
				}
				errors.push(e);
			}
			rule = 'parsing-order';
			s = severity && lintConfig.getSeverity(rule, severity === 2 ? 'html' : 'templateInTable');
			if (s) {
				const e = generateForSelf(this, rect, rule, 'html-in-table', s);
				if (computeEditInfo && severity === 2) {
					e.suggestions = [fixByRemove(e)];
				}
				errors.push(e);
			}
			rule = 'obsolete-tag';
			s = lintConfig.getSeverity(rule, name);
			if (s && obsoleteTags.has(name)) {
				errors.push(generateForSelf(this, rect, rule, 'obsolete-tag', s));
			}
			rule = 'bold-header';
			s = lintConfig.getSeverity(rule, name);
			if (
				s && (name === 'b' || name === 'strong')
				&& this.closest('heading-title,ext')?.type === 'heading-title'
			) {
				const e = generateForSelf(this, rect, rule, 'bold-in-header', s);
				if (computeEditInfo) {
					e.suggestions = [fixByRemove(e)];
				}
				errors.push(e);
			}
			const {html: [, flexibleTags, voidTags]} = this.getAttribute('config'),
				isVoid = voidTags.includes(name),
				isFlexible = flexibleTags.includes(name),
				isNormal = !isVoid && !isFlexible;
			rule = 'unmatched-tag';
			if (closing && (selfClosing || isVoid) || selfClosing && isNormal) {
				s = lintConfig.getSeverity(rule, closing ? 'both' : 'selfClosing');
				if (s) {
					const e = generateForSelf(
						this,
						rect,
						rule,
						closing ? 'closing-and-self-closing' : 'invalid-self-closing',
						s,
					);
					if (computeEditInfo || fix) {
						const open = fixByOpen(start),
							noSelfClosing: LintError.Fix = {
								desc: Parser.msg('no-self-closing'),
								range: [e.endIndex - 2, e.endIndex - 1],
								text: '',
							};
						if (isFlexible) {
							if (computeEditInfo) {
								e.suggestions = [open, noSelfClosing];
							}
						} else if (closing) {
							e.fix = isVoid ? open : noSelfClosing;
						} else if (computeEditInfo) {
							e.suggestions = [
								noSelfClosing,
								fixByClose(e.endIndex, `></${name}>`, -2),
							];
						}
					}
					errors.push(e);
				}
			} else if (!this.findMatchingTag()) {
				const error = generateForSelf(this, rect, rule, closing ? 'unmatched-closing' : 'unclosed-tag'),
					ancestor = this.closest<TranscludeToken>('magic-word');
				if (ancestor && magicWords.has(ancestor.name)) {
					s = lintConfig.getSeverity(rule, 'conditional');
				} else if (closing) {
					s = lintConfig.getSeverity(rule, 'closing');
					error.suggestions = [fixByRemove(error)];
				} else {
					s = lintConfig.getSeverity(rule, 'opening');
					const childNodes = parentNode?.childNodes;
					if (formattingTags.has(name)) {
						if (
							childNodes?.slice(0, childNodes.indexOf(this)).some(
								tag => tag.type === 'html' && tag.name === name && !(tag as this).findMatchingTag(),
							)
						) {
							error.suggestions = [fixByClose(start + 1, '/')];
						}
						if (this.closest('heading-title')) {
							error.rule = 'format-leakage';
							s = lintConfig.getSeverity('format-leakage', name);
						}
					}
				}
				if (s) {
					error.severity = s;
					errors.push(error);
				}
			}
			return errors;
		}
	}
}
