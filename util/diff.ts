import util from 'util';

export type log = (msg: string, ...args: unknown[]) => void;

/* istanbul ignore next */
/** @implements */
export const error: log = (msg, ...args) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	console.error(util.styleText?.('red', msg) ?? msg, ...args);
};

/* istanbul ignore next */
/** @implements */
export const info: log = (msg, ...args) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	console.info(util.styleText?.('green', msg) ?? msg, ...args);
};
