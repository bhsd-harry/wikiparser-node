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
	 * @param {*} val 返回值
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
 * @param {string} oldStr 旧文本
 * @param {string} newStr 新文本
 * @param {string} uid 唯一标识
 */
const diff = async (oldStr, newStr, uid = '') => {
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
	await Promise.all([fs.unlink(oldFile), fs.unlink(newFile)]);
	console.log(stdout?.split('\n')?.slice(4)?.join('\n'));
};

module.exports = diff;
