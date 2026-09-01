import {classes} from '../util/constants';
import type {AttributesToken, FileToken} from '../internal';

/** 以Set表示的class属性 */
export class ClassList extends Set<string> {
	#scope;

	/** @param token 属性或图片节点 */
	constructor(token: AttributesToken | FileToken) {
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
		this.#scope.className = [...this].join(' ');
	}

	override add(value: string): this {
		super.add(value);
		this.#update();
		return this;
	}

	override delete(value: string): boolean {
		const result = super.delete(value);
		this.#update();
		return result;
	}

	override clear(): void {
		super.clear();
		this.#update();
	}
}

classes['ClassList'] = __filename;
