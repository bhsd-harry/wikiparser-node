import Token from '../src/token';

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

	type pseudo = 'root'|'is'|'not'|'nth-child'|'nth-of-type'|'nth-last-child'|'nth-last-of-type'
		|'first-child'|'first-of-type'|'last-child'|'last-of-type'|'only-child'|'only-of-type'|'empty'
		|'contains'|'has'|'header'|'parent'|'hidden'|'visible';
	type pseudoCall = Record<pseudo, string[]>;
}

export {};
