declare global {
	interface BraceExecArray extends RegExpExecArray {
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	}

	type BraceExecArrayOrEmpty = BraceExecArray | {
		readonly 0?: string;
		readonly index?: number;
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	};
}

export {};
