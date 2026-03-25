import util from 'util';

export type log = (msg: string, ...args: unknown[]) => void;

/* c8 ignore start */
/** @implements */
export const error: log = (msg, ...args) => {
	console.error(util.styleText('red', msg), ...args);
};
/* c8 ignore stop */

/* c8 ignore start */
/** @implements */
export const info: log = (msg, ...args) => {
	NPM: console.info(util.styleText('green', msg), ...args);
};
/* c8 ignore stop */
