import type {Token} from '../src';
import type {AstNodeTypes} from '../lib/node';

declare global {
	type AstEventType = 'insert' | 'remove' | 'text' | 'replace';

	interface AstEvent extends Event {
		readonly type: AstEventType;
		readonly target: EventTarget & AstNodeTypes;
		currentTarget: EventTarget & Token;
		prevTarget?: Token;
		bubbles: boolean;
	}

	interface AstEventData {
		position?: number;
		removed?: AstNodeTypes;
		inserted?: AstNodeTypes;
		oldToken?: Token;
		newToken?: Token;
		oldText?: string;
		newText?: string;
		oldKey?: string;
		newKey?: string;
	}

	type AstListener = (e: AstEvent, data: AstEventData) => void;
}
