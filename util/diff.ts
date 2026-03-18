import {green, red} from '@bhsd/nodejs';

export type log = (msg: string, ...args: unknown[]) => void;

/* c8 ignore start */
/** @implements */
export const error: log = (msg, ...args) => {
	console.error(red(msg), ...args);
};
/* c8 ignore stop */

/* c8 ignore start */
/** @implements */
export const info: log = (msg, ...args) => {
	console.info(green(msg), ...args);
};
/* c8 ignore stop */
