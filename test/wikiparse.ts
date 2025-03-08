/* eslint-disable jsdoc/require-jsdoc */
import {Worker} from 'worker_threads';
import {EventEmitter} from 'events';
import type {} from '../extensions/typings';

EventEmitter.defaultMaxListeners = 25;

export const mock = {} as {worker: Worker};

const src = './extensions/dist/base.js',
	head = (): void => {
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const {parentPort}: typeof import('worker_threads') = require('worker_threads');
		const importScripts = require,
			postMessage = parentPort!.postMessage.bind(parentPort),
			self = {
				onmessage(msg: {data: unknown}): void {
					//
				},
			};
		/* eslint-enable @typescript-eslint/no-unused-vars */
		parentPort!.on('message', (message: unknown) => {
			self.onmessage({data: message});
		});
	},
	listeners = new WeakMap<Function, (msg: unknown) => void>();

class MockWorker {
	worker: Promise<Worker>;

	constructor(url: string) {
		this.worker = (async () => {
			const blob = await (await fetch(url)).blob();
			mock.worker = new Worker(
				String(head).replace(/^\(\)\s*=>\s*\{|\}$/gu, '') + await blob.text(),
				{eval: true},
			);
			return mock.worker;
		})();
	}

	async postMessage(data: unknown): Promise<void> {
		(await this.worker).postMessage(data);
	}

	async addEventListener(event: string, listener: (msg: unknown) => void): Promise<void> {
		const f = (msg: unknown): void => {
			listener({data: msg});
		};
		listeners.set(listener, f);
		(await this.worker).on(event, f);
	}

	async removeEventListener(event: string, listener: (msg: unknown) => void): Promise<void> {
		(await this.worker).off(event, listeners.get(listener)!);
		listeners.delete(listener);
	}
}

Object.assign(globalThis, {
	window: globalThis,
	document: {
		currentScript: {src},
	},
	Worker: MockWorker,
	IntersectionObserver: class {},
});
require(`../.${src}`);
require(`../.${src.replace('base.js', 'lint.js')}`);
require(`../.${src.replace('base.js', 'lsp.js')}`);
wikiparse.CDN = 'https://cdn.jsdelivr.net/npm/wikiparser-node';
