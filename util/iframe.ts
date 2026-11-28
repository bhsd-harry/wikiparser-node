import type {MwConfig} from '@bhsd/cm-util';

declare interface Implementation {
	files: Record<string, Function>;
}

declare global {
	const mw: {
		config: {
			values: {extCodeMirrorConfig?: MwConfig};
		};
	};
}

const env = /** @ignore */ (): void => {
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
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
				values: {} as {extCodeMirrorConfig?: MwConfig},
				/** @ignore */
				set({extCodeMirrorConfig}: {extCodeMirrorConfig: MwConfig}): void {
					this.values.extCodeMirrorConfig = extCodeMirrorConfig;
				},
			},
		},
	});

	addEventListener('error', ({error, target}) => {
		if (target && target !== globalThis) {
			error = new Error(`Failed to load ${(target as HTMLScriptElement).src}`);
		}
		window.parent.postMessage({error}, '*');
	}, true);

	addEventListener('load', () => {
		window.parent.postMessage(mw.config.values.extCodeMirrorConfig, '*');
	});
};

const envDataUrl = `data:text/javascript;base64,${btoa(`(${String(env)})()`)}`;

/**
 * Executes the CodeMirror extension in an iframe and returns the configuration object.
 * @param src The URL of the CodeMirror extension module
 */
const executeCodeMirrorInIframe = (src: string): Promise<MwConfig> => new Promise((resolve, reject) => {
	const iframe = document.createElement('iframe');
	iframe.sandbox.add('allow-scripts');
	iframe.style.display = 'none';
	document.body.append(iframe);
	let settled = false;

	const finish = /** @ignore */ (error: Error | undefined, data?: MwConfig): void => {
		if (settled) {
			return;
		}
		settled = true;
		clearTimeout(timeout);
		removeEventListener('message', handler);
		iframe.remove();
		if (error) {
			reject(error);
		} else {
			resolve(data!);
		}
	};

	const handler = /** @ignore */ ({source, data}: MessageEvent): void => {
		if (source === iframe.contentWindow) {
			if (data && 'error' in data) {
				finish((data as {error: Error}).error);
			} else {
				finish(undefined, data as MwConfig);
			}
		}
	};
	addEventListener('message', handler);
	const timeout = setTimeout(() => {
		finish(new Error('Timed out after 5000 ms.'));
	}, 5e3);

	iframe.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src data: ${
		new URL(src).origin
	};"><script src="${envDataUrl}"></script><script src="${
		src
	}/load.php?modules=ext.CodeMirror.data|ext.CodeMirror"></script>`;
});

export default executeCodeMirrorInIframe;
