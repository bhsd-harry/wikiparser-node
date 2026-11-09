import type {
	AttributesToken,
} from '../internal';

/**
 * Class attribute in Set
 *
 * 以Set表示的class属性
 */
export class ClassList extends Set<string> {
	#scope;

	/** value of the class list as a string */
	get value(): string {
		return [...this].join(' ');
	}

	/** @param token 属性或图片节点 */
	constructor(
		token: AttributesToken
		,
	) {
		super();
		for (const name of token.className.split(/\s+/u)) {
			if (name) {
				super.add(name);
			}
		}
		this.#scope = token;
	}

	/** 更新class属性 */
	#update(): void {
		this.#scope.className = this.value;
	}

	/**
	 * Add the specified classes to the list
	 * @param values classes to add
	 */
	override add(...values: string[]): this {
		for (const value of values) {
			super.add(value);
		}
		this.#update();
		return this;
	}
}
