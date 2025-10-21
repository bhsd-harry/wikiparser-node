/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
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
		const {childNodes} = Parser.parseWithRef(val, this),
			token = Shadow.run(
				// @ts-expect-error abstract class
				(): ParameterToken => new ParameterToken(undefined, undefined, this.getAttribute('config')),
			);
		token.lastChild.concat(childNodes); // eslint-disable-line unicorn/prefer-spread
		return this.insertAt(token);
	};

TranscludeToken.prototype.setValue =
	/** @implements */
	function(key, value): void {
		/* istanbul ignore if */
		if (!this.isTemplate()) {
			throw new Error('TranscludeToken.setValue method is only for templates!');
		}
		const arg = this.getArg(key);
		if (arg) {
			arg.setValue(value);
			return;
		}
		const k = Parser.parseWithRef(key, this),
			v = Parser.parseWithRef(value, this),
			token = Shadow.run(
				// @ts-expect-error abstract class
				(): ParameterToken => new ParameterToken(undefined, undefined, this.getAttribute('config')),
			);
		token.firstChild.safeAppend(k.childNodes);
		token.lastChild.concat(v.childNodes); // eslint-disable-line unicorn/prefer-spread
		this.insertAt(token);
	};

TranscludeToken.prototype.replaceTemplate =
	/** @implements */
	function(title): void {
		const {type, firstChild} = this;
		/* istanbul ignore if */
		if (type === 'magic-word') {
			throw new Error('TranscludeToken.replaceTemplate method is only for templates!');
		}
		const {childNodes} = Parser.parseWithRef(title, this, 2);
		(firstChild as AtomToken).safeReplaceChildren(childNodes);
	};

TranscludeToken.prototype.replaceModule =
	/** @implements */
	function(title): void {
		const {type, name, length, childNodes: [, mod]} = this;
		/* istanbul ignore if */
		if (type !== 'magic-word' || name !== 'invoke') {
			throw new Error('TranscludeToken.replaceModule method is only for modules!');
		} else if (length === 1) {
			Token.prototype.insertAt.call(
				this,
				Shadow.run(() => new AtomToken(
					undefined,
					'invoke-module',
					this.getAttribute('config'),
					[],
					{'Stage-1': ':', '!ExtToken': ''},
				)),
			);
			return;
		}
		const {childNodes} = Parser.parseWithRef(title, this, 2);
		(mod as AtomToken).safeReplaceChildren(childNodes);
	};

TranscludeToken.prototype.replaceFunction =
	/** @implements */
	function(func): void {
		const {type, name, length, childNodes: [,, fun]} = this;
		/* istanbul ignore next */
		if (type !== 'magic-word' || name !== 'invoke') {
			throw new Error('TranscludeToken.replaceModule method is only for modules!');
		} else if (length < 2) {
			throw new Error('No module name specified!');
		} else if (length === 2) {
			Token.prototype.insertAt.call(
				this,
				Shadow.run(() => new AtomToken(
					undefined,
					'invoke-function',
					this.getAttribute('config'),
					[],
					{'Stage-1': ':', '!ExtToken': ''},
				)),
			);
			return;
		}
		const {childNodes} = Parser.parseWithRef(func, this, 2);
		(fun as AtomToken).safeReplaceChildren(childNodes);
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
			let noMoreAnon = anonCount === 0 || !key.trim() || !Number.isInteger(Number(key));
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
				const str = key.slice(0, -/(?<!\d)\d+$/u.exec(key)![0].length);
				/^a\d+$/u; // eslint-disable-line @typescript-eslint/no-unused-expressions
				const regex = new RegExp(String.raw`^${escapeRegExp(str)}\d+$`, 'u'),
					series = this.getAllArgs().filter(({name}) => regex.test(name)),
					ordered = series.every(({name}, i) => {
						const j = Number(name.slice(str.length)),
							cmp = j <= i + 1 && (i === 0 || j >= last || name === key);
						last = j;
						return cmp;
					});
				if (ordered) {
					for (let i = 0; i < series.length; i++) {
						const arg = series[i]!,
							name = `${str}${i + 1}`;
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
					: this.normalizeTitle(this.childNodes[1].text(), 828, {temporary: true, page: ''}).title
				} still has ${remaining} duplicated ${key} parameters:\n${[...this.getArgs(key)].map(arg => {
					const {top, left} = arg.getBoundingClientRect();
					return `Line ${String(top)} Column ${String(left)}`;
				}).join('\n')}`);
				duplicatedKeys.push(key);
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
		const stripped = this.toString().slice(2, -2),
			parsed = Parser.parseWithRef(stripped, this, 4);
		for (const table of parsed.childNodes) {
			if (table.is<TableToken>('table')) {
				table.escape();
			}
		}
		const {firstChild, length} = Parser.parseWithRef(`{{${parsed.toString()}}}`, this);
		/* istanbul ignore if */
		if (length !== 1 || !(firstChild instanceof TranscludeToken)) {
			throw new Error('Failed to escape tables!');
		}
		this.safeReplaceWith(firstChild);
		return firstChild;
	};

classes['ExtendedTranscludeToken'] = __filename;
