import {BoundingRect} from './rect';
import Parser from '../index';
import type {LintError} from '../base';
import type {rangeGenerator} from '../util/lint';
import type {AstNodes} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

declare type LintErrorRange = Omit<LintError, 'rule' | 'message' | 'severity'>;

/** 语法错误，但只在需要时计算错误范围 */
export class LazyLintError implements LintError {
	#token;
	#rect;
	#func;
	#range: LintErrorRange | undefined;
	readonly rule;
	readonly message;
	readonly severity;

	/** @implements */
	get startIndex(): number {
		return this.getRange().startIndex;
	}

	/** @implements */
	get startLine(): number {
		return this.getRange().startLine;
	}

	/** @implements */
	get startCol(): number {
		return this.getRange().startCol;
	}

	/** @implements */
	get endIndex(): number {
		return this.getRange().endIndex;
	}

	/** @implements */
	get endLine(): number {
		return this.getRange().endLine;
	}

	/** @implements */
	get endCol(): number {
		return this.getRange().endCol;
	}

	/** @class */
	constructor(
		token: AstNodes,
		rect: BoundingRect | {start: number},
		func: rangeGenerator,
		rule: LintError.Rule,
		msg: string,
		severity: LintError.Severity,
	) {
		this.#token = token;
		this.#rect = rect;
		this.#func = func;
		this.rule = rule;
		this.message = Parser.msg(msg);
		this.severity = severity;
	}

	/** 计算范围 */
	getRange(): LintErrorRange {
		if (!this.#range) {
			const {start} = this.#rect,
				{top, left} = this.#rect instanceof BoundingRect ? this.#rect : new BoundingRect(this.#token, start),
				{offsetHeight, offsetWidth} = this.#token,
				{startIndex, startLine, startCol} = this.#func(this.#token, start, top, left);
			this.#range = {
				startIndex,
				endIndex: startIndex + this.#token.toString().length,
				startLine,
				endLine: startLine + offsetHeight - 1,
				startCol,
				endCol: offsetHeight === 1 ? startCol + offsetWidth : offsetWidth,
			};
		}
		return this.#range;
	}
}

classes['LazyLintError'] = __filename;
