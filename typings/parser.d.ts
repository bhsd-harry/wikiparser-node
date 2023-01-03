declare global {
	interface BracketExecArray extends RegExpExecArray {
		parts: string[][];
		findEqual: boolean;
		pos: number;
	}
	interface SelectorArray extends Array<string|RegExpExecArray> {
		relation: string|undefined;
	}

	type pseudo = 'root'|'is'|'not'|'nth-child'|'nth-of-type'|'nth-last-child'|'nth-last-of-type'
		|'first-child'|'first-of-type'|'last-child'|'last-of-type'|'only-child'|'only-of-type'|'empty'
		|'contains'|'has'|'header'|'parent'|'hidden'|'visible';
}

export {};
