import type {AstNodes, Token} from '../internal';

declare global {
	type AstEventType = 'insert' | 'remove' | 'text' | 'replace';

	interface AstEvent extends Event {
		readonly type: AstEventType;
		readonly target: EventTarget & AstNodes;
		readonly currentTarget: EventTarget & Token;
		readonly prevTarget?: Token;
	}

	type AstEventData = ({
		readonly type: 'insert';
		readonly position: number;
	} | {
		readonly type: 'remove';
		readonly position: number;
		readonly removed: AstNodes;
	} | {
		readonly type: 'text';
		readonly oldText: string;
	} | {
		readonly type: 'replace';
		readonly position: number;
		readonly oldToken: Token;
	}) & {
		oldKey?: string;
		newKey?: string;
	};

	type AstListener = (e: AstEvent, data: AstEventData) => void;
}
