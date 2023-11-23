declare global {
	interface BraceExecArray extends RegExpExecArray {
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	}

	type BraceExecArrayOrEmpty = BraceExecArray | {
		0?: string;
		index?: number;
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	};
}

export {};
