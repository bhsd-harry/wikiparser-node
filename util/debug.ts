declare interface Shadow {
	/** @private */
	run<T>(callback: () => T): T;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Shadow: Shadow = {
	/** @implements */
	run(callback) {
		const result = callback();
		return result;
	},
};
