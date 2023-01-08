'use strict';
const {spawn} = require('child_process'),
	fs = require('fs/promises');

process.on('unhandledRejection', e => {
	console.error(e);
});

/**
 * 将shell命令转化为Promise对象
 * @param {string} command shell指令
 * @param {string[]} args shell输入参数
 * @returns {Promise<?string>}
 */
const cmd = (command, args) => new Promise(resolve => {
	let timer, shell;

	/**
	 * 清除进程并返回
	 * @param {any} val 返回值
	 */
	const r = val => {
		clearTimeout(timer);
		shell.kill('SIGINT');
		resolve(val);
	};
	try {
		shell = spawn(command, args);
		timer = setTimeout(() => {
			shell.kill('SIGINT');
		}, 60 * 1000);
		let buf = '';
		shell.stdout.on('data', data => {
			buf += data.toString();
		});
		shell.stdout.on('end', () => {
			r(buf);
		});
		shell.on('exit', () => {
			r(shell.killed ? null : '');
		});
		shell.on('error', () => {
			r(null);
		});
	} catch {
		r(null);
	}
});

/**
 * 比较两个文件
 * @param {string} oldfile 旧文件
 * @param {string} newfile 新文件
 */
const diff = async (oldfile, newfile) => {
	if (oldfile === newfile) {
		return;
	}
	await Promise.all([fs.writeFile('npmTestOldContent', oldfile), fs.writeFile('npmTestNewContent', newfile)]);
	const stdout = await cmd('git', [
		'diff',
		'--color-words=[\xC0-\xFF][\x80-\xBF]+|<?/?\\w+/?>?|[^[:space:]]',
		'-U0',
		'--no-index',
		'npmTestOldContent',
		'npmTestNewContent',
	]);
	await Promise.all([fs.unlink('npmTestOldContent'), fs.unlink('npmTestNewContent')]);
	console.log(stdout?.split('\n')?.slice(4)?.join('\n'));
};

/**
 * 延时
 * @param {number} t 秒数
 */
const sleep = t => new Promise(resolve => {
	setTimeout(resolve, t * 1000);
});

module.exports = {diff, sleep};
