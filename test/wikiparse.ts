/* eslint-disable jsdoc/require-jsdoc */
import {Worker} from 'worker_threads';
import type {MessagePort} from 'worker_threads';
import type {} from '../extensions/typings';

export const mock = {} as {worker: Worker};

let parentPort: MessagePort,
	self: {onmessage(arg: {data: unknown}): void};
const src = './extensions/dist/base.js',
	head = (): void => {
		({parentPort} = require('worker_threads'));
		self = {
			onmessage(): void {
				//
			},
		};
		parentPort.on('message', (message: unknown) => {
			self.onmessage({data: message});
		});
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const postMessage = parentPort.postMessage.bind(parentPort);
	},
	listeners = new WeakMap<Function, (msg: unknown) => void>();

class MockWorker {
	worker: Promise<Worker>;

	constructor(url: string) {
		this.worker = (async () => {
			const blob = await (await fetch(url)).blob(); // eslint-disable-line n/no-unsupported-features/node-builtins
			mock.worker = new Worker(
				String(head).slice(8, -2) + (await blob.text()).replaceAll('importScripts(', 'require('),
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
