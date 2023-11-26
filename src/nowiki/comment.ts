import {generateForSelf} from '../../util/lint';
import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {Token} from '../index';

/** HTML注释，不可见 */
// @ts-expect-error not implementing all abstract methods
export class CommentToken extends hidden(NowikiBaseToken) {
	override readonly type = 'comment';
	closed;

	/* NOT FOR BROWSER */

	/** 内部wikitext */
	get innerText(): string {
		return this.firstChild.data;
	}

	set innerText(text) {
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			{length, firstChild} = Parser.parse(`<!--${text}-->`, include, 1, config);
		if (length !== 1 || firstChild!.type !== 'comment') {
			throw new RangeError('不允许包含 "-->"！');
		}
		this.setText(text);
	}

	/* NOT FOR BROWSER END */

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
		this.closed = closed;
		Object.defineProperty(this, 'closed', {enumerable: false});
	}

	/** @private */
	protected override getPadding(): number {
		return 4;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.closed ? [] : [generateForSelf(this, {start}, 'unclosed HTML comment')];
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (!this.closed && this.nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return omit && this.matchesTypes(omit) ? '' : `<!--${this.firstChild.data}${this.closed ? '-->' : ''}`;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		return Parser.run(() => new CommentToken(
			this.firstChild.data,
			this.closed,
			this.getAttribute('config'),
		) as this);
	}
}

Parser.classes['CommentToken'] = __filename;
