import Token from '../src';

declare global {
	interface AstEvent extends Event {
		readonly target: Token;
		currentTarget: Token;
		prevTarget: ?Token;
	};
	interface AstEventData {
		position: number;
		removed: string|Token;
		inserted: string|Token;
		oldToken: Token;
		newToken: Token;
		oldText: string;
		newText: string;
		oldKey: string;
		newKey: string;
	}
	type AstListener = (e: AstEvent, data: AstEventData) => any;
}

export {};
