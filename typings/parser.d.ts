declare global {
	interface SelectorArray extends Array<
		string
		| [string, string]
		| [string, string | undefined, string | undefined, string | undefined]
	> {
		relation?: string;
	}

	interface BracketExecArray extends RegExpExecArray {
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	}

	type BracketExecArrayOrEmpty = BracketExecArray | {
		0?: string;
		index?: number;
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	};
}

export {};
