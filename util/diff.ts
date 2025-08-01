import chalk from 'chalk';

export type log = (msg: string, ...args: unknown[]) => void;

/* istanbul ignore next */
/** @implements */
export const error: log = (msg, ...args) => {
	console.error(chalk.red(msg), ...args);
};

/* istanbul ignore next */
/** @implements */
export const info: log = (msg, ...args) => {
	console.info(chalk.green(msg), ...args);
};
