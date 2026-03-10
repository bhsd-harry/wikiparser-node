import type {MwConfig} from '@bhsd/cm-util';

declare interface Implementation {
	files: Record<string, Function>;
}

/**
 * Execute the data script.
 * @param obj MediaWiki module implementation
 */
const execute = (obj: Implementation): void => {
	Object.entries(obj.files).find(([k]) => k.endsWith('.data.js'))![1]();
};

Object.assign(globalThis, {
	mw: {
		loader: {
			done: false,
			/** @ignore */
			impl(callback: () => [string, Implementation]): void {
				execute(callback()[1]);
			},
			/** @ignore */
			implement(name: string, callback: (() => void) | Implementation): void {
				if (typeof callback === 'object') {
					execute(callback);
				} else if (!this.done) {
					callback();
				}
				if (name.startsWith('ext.CodeMirror.data')) {
					this.done = true;
				}
			},
			/** @ignore */
			state(): void {
				//
			},
		},
		config: {
			/** @ignore */
			set({extCodeMirrorConfig}: {extCodeMirrorConfig: MwConfig}): void {
				console.log(JSON.stringify(extCodeMirrorConfig));
			},
		},
	},
});
