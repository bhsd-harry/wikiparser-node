import Token = require('../src');
import AstNodeTypes = require('./node');

interface AstEvent extends Event {
	readonly type: string;
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

export {
	AstListener,
	AstEventData,
};
