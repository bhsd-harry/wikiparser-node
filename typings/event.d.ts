import type {AstNodes} from '../lib/node';
import type {Token} from '../src';

declare global {
	type AstEventType = 'insert' | 'remove' | 'text' | 'replace';

	interface AstEvent extends Event {
		readonly type: AstEventType;
		readonly target: EventTarget & AstNodes;
		currentTarget: EventTarget & Token;
		prevTarget?: Token;
		bubbles: boolean;
	}

	interface AstEventData {
		position?: number;
		removed?: AstNodes;
		inserted?: AstNodes;
		oldToken?: Token;
		newToken?: Token;
		oldText?: string;
		newText?: string;
		oldKey?: string;
		newKey?: string;
	}

	type AstListener = (e: AstEvent, data: AstEventData) => void;
}
