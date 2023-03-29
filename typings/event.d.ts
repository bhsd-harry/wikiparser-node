import Token = require('../src');
import AstText = require('../lib/text');

declare global {
	interface AstEvent {
		readonly type: string;
		readonly target: Token & AstText;
		currentTarget: Token;
		prevTarget: Token;
		bubbles: boolean;
	}
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
	type AstListener = (e: AstEvent, data: AstEventData) => unknown;
}

export {};
