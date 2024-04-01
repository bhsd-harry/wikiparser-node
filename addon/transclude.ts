/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {classes} from '../util/constants';
import {Shadow, isToken} from '../util/debug';
import {escapeRegExp} from '../util/string';
import Parser from '../index';
import {Token} from '../src/index';
import {TranscludeToken} from '../src/transclude';
import {ParameterToken} from '../src/parameter';
import {AtomToken} from '../src/atom';
import type {TableToken} from '../internal';

TranscludeToken.prototype.newAnonArg =
	/** @implements */
	function(val): ParameterToken {
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(val, this.getAttribute('include'), undefined, config),
			// @ts-expect-error abstract class
			token: ParameterToken = Shadow.run(() => new ParameterToken(undefined, undefined, config));
		token.lastChild.append(...childNodes);
		token.afterBuild();
		return this.insertAt(token);
	};

TranscludeToken.prototype.setValue =
	/** @implements */
	function(key, value): void {
		if (!this.isTemplate()) {
			throw new Error('setValue 方法仅供模板使用！');
		}
		const arg = this.getArg(key);
		if (arg) {
			arg.setValue(value);
			return;
		}
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			k = Parser.parse(key, include, undefined, config),
			v = Parser.parse(value, include, undefined, config),
			// @ts-expect-error abstract class
			token: ParameterToken = Shadow.run(() => new ParameterToken(undefined, undefined, config));
		token.firstChild.append(...k.childNodes);
		token.lastChild.append(...v.childNodes);
		token.afterBuild();
		this.insertAt(token);
	};

TranscludeToken.prototype.replaceTemplate =
	/** @implements */
	function(title): void {
		if (this.type === 'magic-word') {
			throw new Error('replaceTemplate 方法仅用于更换模板！');
		}
		const {childNodes} = Parser.parse(title, this.getAttribute('include'), 2, this.getAttribute('config'));
		(this.firstChild as AtomToken).replaceChildren(...childNodes);
	};

TranscludeToken.prototype.replaceModule =
	/** @implements */
	function(title): void {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error('replaceModule 方法仅用于更换模块！');
		}
		const config = this.getAttribute('config');
		if (this.length === 1) {
			Token.prototype.insertAt.call(this, new AtomToken(undefined, 'invoke-module', config, [], {
				'Stage-1': ':', '!ExtToken': '',
			}));
			return;
		}
		const {childNodes} = Parser.parse(title, this.getAttribute('include'), 2, config);
		(this.childNodes[1] as AtomToken).replaceChildren(...childNodes);
	};

TranscludeToken.prototype.replaceFunction =
	/** @implements */
	function(func): void {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error('replaceModule 方法仅用于更换模块！');
		} else if (this.length < 2) {
			throw new Error('尚未指定模块名称！');
		}
		const config = this.getAttribute('config');
		if (this.length === 2) {
			Token.prototype.insertAt.call(this, new AtomToken(undefined, 'invoke-function', config, [], {
				'Stage-1': ':', '!ExtToken': '',
			}));
			return;
		}
		const {childNodes} = Parser.parse(func, this.getAttribute('include'), 2, config);
		(this.childNodes[2] as AtomToken).replaceChildren(...childNodes);
	};

TranscludeToken.prototype.fixDuplication =
	/** @implements */
	function(aggressive): string[] {
		if (!this.hasDuplicatedArgs()) {
			return [];
		}
		const duplicatedKeys: string[] = [];
		let anonCount = this.getAnonArgs().length;
		for (const [key, args] of this.getDuplicatedArgs()) {
			if (args.length <= 1) {
				continue;
			}
			const values = new Map<string, ParameterToken[]>();
			for (const arg of args) {
				const val = arg.getValue().trim();
				if (values.has(val)) {
					values.get(val)!.push(arg);
				} else {
					values.set(val, [arg]);
				}
			}
			let noMoreAnon = anonCount === 0 || !key.trim() || isNaN(key as unknown as number);
			const emptyArgs = values.get('') ?? [],
				duplicatedArgs = [...values].filter(([val, {length}]) => val && length > 1).flatMap(([, curArgs]) => {
					const anonIndex = noMoreAnon ? -1 : curArgs.findIndex(({anon}) => anon);
					if (anonIndex !== -1) {
						noMoreAnon = true;
					}
					curArgs.splice(anonIndex, 1);
					return curArgs;
				}),
				badArgs = [...emptyArgs, ...duplicatedArgs],
				index = noMoreAnon ? -1 : emptyArgs.findIndex(({anon}) => anon);
			if (badArgs.length === args.length) {
				badArgs.splice(index, 1);
			} else if (index !== -1) {
				this.anonToNamed();
				anonCount = 0;
			}
			for (const arg of badArgs) {
				arg.remove();
			}
			let remaining = args.length - badArgs.length;
			if (remaining === 1) {
				continue;
			} else if (aggressive && (anonCount ? /\D\d+$/u : /(?:^|\D)\d+$/u).test(key)) {
				let last: number;
				// eslint-disable-next-line es-x/no-regexp-lookbehind-assertions
				const str = key.slice(0, -/(?<!\d)\d+$/u.exec(key)![0].length),
					regex = new RegExp(`^${escapeRegExp(str)}\\d+$`, 'u'),
					series = this.getAllArgs().filter(({name}) => regex.test(name)),
					ordered = series.every(({name}, i) => {
						const j = Number(name.slice(str.length)),
							cmp = j <= i + 1 && (i === 0 || j >= last || name === key);
						last = j;
						return cmp;
					});
				if (ordered) {
					for (let i = 0; i < series.length; i++) {
						const name = `${str}${i + 1}`,
							arg = series[i]!;
						if (arg.name !== name) {
							if (arg.name === key) {
								remaining--;
							}
							arg.rename(name, true);
						}
					}
				}
			}
			if (remaining > 1) {
				Parser.error(`${this.type === 'template'
					? this.name
					: this.normalizeTitle(this.childNodes[1].text(), 828)
						.title
				} 还留有 ${remaining} 个重复的 ${key} 参数：${[...this.getArgs(key)].map(arg => {
					const {top, left} = arg.getBoundingClientRect();
					return `第 ${String(top)} 行第 ${String(left)} 列`;
				}).join('、')}`);
				duplicatedKeys.push(key);
				continue;
			}
		}
		return duplicatedKeys;
	};

TranscludeToken.prototype.escapeTables =
	/** @implements */
	function(): TranscludeToken {
		if (!/\n[^\S\n]*(?::+[^\S\n]*)?\{\|/u.test(this.text())) {
			return this;
		}
		const stripped = String(this).slice(2, -2),
			include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			parsed = Parser.parse(stripped, include, 4, config),
			isTable = isToken<TableToken>('table');
		for (const table of parsed.childNodes) {
			if (isTable(table)) {
				table.escape();
			}
		}
		const {firstChild, length} = Parser.parse(`{{${String(parsed)}}}`, include, undefined, config);
		if (length !== 1 || !(firstChild instanceof TranscludeToken)) {
			throw new Error('转义表格失败！');
		}
		this.safeReplaceWith(firstChild);
		return firstChild;
	};

classes['ExtendedTranscludeToken'] = __filename;