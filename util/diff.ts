import type {Chalk} from 'chalk';

export type log = (msg: string, ...args: unknown[]) => void;

let chalk: Chalk | null | undefined;
export const loadChalk = /** @ignore */ (): Chalk | null => {
	if (chalk === undefined) {
		try {
			chalk = require('chalk') as Chalk;
		} catch {
			chalk = null;
		}
	}
	return chalk;
};

/* istanbul ignore next */
/** @implements */
export const error: log = (msg, ...args) => {
	console.error(loadChalk()?.red(msg) ?? msg, ...args);
};

/* istanbul ignore next */
/** @implements */
export const info: log = (msg, ...args) => {
	console.info(loadChalk()?.green(msg) ?? msg, ...args);
};
