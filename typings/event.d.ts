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

	type AstEventData = ({
		type: 'insert';
		position: number;
		inserted: AstNodes;
	} | {
		type: 'remove';
		position: number;
		removed: AstNodes;
	} | {
		type: 'text';
		oldText: string;
	} | {
		type: 'replace';
		position: number;
		oldToken: Token;
		newToken: Token;
	}) & {
		oldKey?: string;
		newKey?: string;
	};

	type AstListener = (e: AstEvent, data: AstEventData) => void;
}
