/* eslint-disable jsdoc/require-jsdoc */
import {classes} from '../util/constants';
import type {TokenTypes} from '../base';
import type {Title} from '../lib/title';
import type {Token} from '../internal';

declare type Target = Token & {link?: string | Title};

/** 用于选择器的属性 */
export class Attributes {
	token: Target;
	type: TokenTypes;
	#link: string | Title | undefined;
	#invalid: boolean | undefined;
	#siblings: Token[] | undefined;
	#siblingsOfType: Token[] | undefined;
	#siblingsCount: number | undefined;
	#siblingsCountOfType: number | undefined;
	#index: number | undefined;
	#indexOfType: number | undefined;
	#lastIndex: number | undefined;
	#lastIndexOfType: number | undefined;

	constructor(token: Token) {
		this.token = token;
		this.type = token.type;
	}

	get link(): string | Title | undefined {
		this.#link ??= this.token.link;
		return this.#link;
	}

	get invalid(): boolean {
		this.#invalid ??= this.token.getAttribute('invalid');
		return this.#invalid;
	}

	get siblings(): Token[] | undefined {
		this.#siblings ??= this.token.parentNode?.children;
		return this.#siblings;
	}

	get siblingsOfType(): Token[] | undefined {
		this.#siblingsOfType ??= this.siblings?.filter(({type}) => type === this.type);
		return this.#siblingsOfType;
	}

	get siblingsCount(): number {
		this.#siblingsCount ??= this.siblings?.length ?? 1;
		return this.#siblingsCount;
	}

	get siblingsCountOfType(): number {
		this.#siblingsCountOfType ??= this.siblingsOfType?.length ?? 1;
		return this.#siblingsCountOfType;
	}

	get index(): number {
		this.#index ??= (this.siblings?.indexOf(this.token) ?? 0) + 1;
		return this.#index;
	}

	get indexOfType(): number {
		this.#indexOfType ??= (this.siblingsOfType?.indexOf(this.token) ?? 0) + 1;
		return this.#indexOfType;
	}

	get lastIndex(): number {
		this.#lastIndex ??= this.siblingsCount - this.index + 1;
		return this.#lastIndex;
	}

	get lastIndexOfType(): number {
		this.#lastIndexOfType ??= this.siblingsCountOfType - this.indexOfType + 1;
		return this.#lastIndexOfType;
	}
}

classes['Attributes'] = __filename;
