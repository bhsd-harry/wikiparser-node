import fs from 'fs/promises';
import {spawn} from 'child_process';
import type {ChildProcessWithoutNullStreams} from 'child_process';
import type {Chalk} from 'chalk';

/* istanbul ignore next */
process.on('unhandledRejection', e => {
	console.error(e);
});

export type log = (msg: string, ...args: unknown[]) => void;

/* istanbul ignore next */
/**
 * 将shell命令转化为Promise对象
 * @param command shell指令
 * @param args shell输入参数
 */
export const cmd = (command: string, args: readonly string[]): Promise<string | undefined> => new Promise(resolve => {
	let timer: NodeJS.Timeout | undefined,
		shell: ChildProcessWithoutNullStreams | undefined;

	/**
	 * 清除进程并返回
	 * @param val 返回值
	 */
	const r = (val?: string): void => {
		clearTimeout(timer);
		shell?.kill('SIGINT');
		resolve(val);
	};
	try {
		shell = spawn(command, args);
		timer = setTimeout(() => {
			shell!.kill('SIGINT');
		}, 60 * 1e3);
		let buf = '';
		shell.stdout.on('data', data => {
			buf += String(data);
		});
		shell.stdout.on('end', () => {
			r(buf);
		});
		shell.on('exit', () => {
			r(shell!.killed ? undefined : '');
		});
		shell.on('error', () => {
			r(undefined);
		});
	} catch {
		r(undefined);
	}
});

/* istanbul ignore next */
/**
 * 比较两个文件
 * @param oldStr 旧文本
 * @param newStr 新文本
 * @param uid 唯一标识
 */
export const diff = async (oldStr: string, newStr: string, uid: number): Promise<void> => {
	if (oldStr === newStr) {
		return;
	}
	const oldFile = `diffOld${uid}`,
		newFile = `diffNew${uid}`;
	await Promise.all([fs.writeFile(oldFile, oldStr), fs.writeFile(newFile, newStr)]);
	const stdout = await cmd('git', [
		'diff',
		'--color-words=[\xC0-\xFF][\x80-\xBF]+|<?/?\\w+/?>?|[^[:space:]]',
		'-U0',
		'--no-index',
		oldFile,
		newFile,
	]);
	console.log(stdout?.split('\n').slice(4).join('\n'));
	await Promise.allSettled([fs.unlink(oldFile), fs.unlink(newFile)]);
};

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
