declare global {
	interface BracketExecArray extends RegExpExecArray {
		parts: string[][];
		findEqual: boolean;
		pos: number;
	}
}

export {};
