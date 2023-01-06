import Token from '../src';
import Text from '../lib/text';

declare global {
	interface AstEvent extends Event {
		readonly target: Token & Text;
		currentTarget: Token;
		prevTarget: ?Token;
	};
	interface AstEventData {
		position: number;
		removed: Text|Token;
		inserted: Text|Token;
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
