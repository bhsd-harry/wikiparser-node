declare global {
	interface BraceExecArray extends RegExpExecArray {
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	}

	type BraceExecArrayOrEmpty = Partial<BraceExecArray>;
}

export {};
