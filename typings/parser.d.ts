declare global {
	interface SelectorArray extends Array<
		string
		| [string, string]
		| [string, string | undefined, string | undefined, string | undefined]
	> {
		relation?: string;
	}

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
