import {classes} from '../util/constants';
import type {AttributesToken, FileToken} from '../internal';

/**
 * Class attribute in Set
 *
 * 以Set表示的class属性
 */
export class ClassList extends Set<string> {
	#scope;

	/** number of classes */
	get length(): number {
		return this.size;
	}

	/** value of the class list as a string */
	get value(): string {
		return [...this].join(' ');
	}

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

	override delete(value: string): boolean {
		const result = super.delete(value);
		this.#update();
		return result;
	}

	override clear(): void {
		super.clear();
		this.#update();
	}

	override toString(): string {
		return this.value;
	}

	/**
	 * Get the class in the list by its index
	 * @param index index of the class
	 */
	item(index: number): string | undefined {
		return [...this][Math.trunc(index)];
	}

	/**
	 * Check if the class list contains the given class
	 * @param value class to check
	 */
	contains(value: string): boolean {
		return this.has(value);
	}

	/**
	 * Remove the specified classes from the list
	 * @param values classes to remove
	 */
	remove(...values: string[]): void {
		for (const value of values) {
			super.delete(value);
		}
		this.#update();
	}

	/**
	 * Replace the specified class with another one
	 * @param oldClass old class
	 * @param newClass new class
	 */
	replace(oldClass: string, newClass: string): boolean {
		if (this.has(oldClass)) {
			super.delete(oldClass);
			super.add(newClass);
			this.#update();
			return true;
		}
		return false;
	}

	/**
	 * Toggle the specified class in the list
	 * @param value class to toggle
	 * @param force if included, determines whether to add or remove the class
	 */
	toggle(value: string, force?: boolean): boolean {
		// eslint-disable-next-line unicorn/no-useless-coercion
		const adding = force === undefined ? !this.has(value) : Boolean(force);
		this[adding ? 'add' : 'delete'](value);
		return adding;
	}
}

classes['ClassList'] = __filename;
