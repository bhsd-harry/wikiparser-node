import Token from '../src';
import AstText from '../lib/text';

declare global {
	interface AstEvent extends Event {
		readonly target: Token & AstText;
		currentTarget: Token;
		prevTarget: ?Token;
	};
	interface AstEventData {
		position: number;
		removed: AstText|Token;
		inserted: AstText|Token;
		oldToken: Token;
		newToken: Token;
		oldText: string;
		newText: string;
		oldKey: string;
		newKey: string;
	}
	type AstListener = (e: AstEvent, data: AstEventData) => *;
}

export {};
