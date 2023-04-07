import Token = require('../src');
import AstText = require('../lib/text');

export interface AstEvent {
	readonly type: string;
	readonly target: Token & AstText;
	currentTarget: Token;
	prevTarget: Token;
	bubbles: boolean;
}
export interface AstEventData {
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
export type AstListener = (e: AstEvent, data: AstEventData) => void;
