import {mixin} from '../util/debug';
import {generateForChild, fixByRemove} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {ParamLineToken} from '../src/paramLine';
import type {LintError} from '../base';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';
import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

export interface ParamLineParentBase {

	/**
	 * Get all parameter keys
	 *
	 * 获取所有参数键
	 */
	getKeys(): Set<string>;

	/**
	 * Get parameters with the specified key
	 *
	 * 获取指定参数
	 * @param key parameter key / 参数键
	 */
	getParams(key: string): ParamLineToken[];

	/**
	 * Get duplicated parameters
	 *
	 * 获取重复参数
	 */
	getDuplicatedParams(): [string, ParamLineToken[]][];

	/* NOT FOR BROWSER */

	/**
	 * Check if there is a parameter with the specified key
	 *
	 * 是否具有某参数
	 * @param key parameter key / 参数键
	 */
	hasParam(key: string): boolean;

	/**
	 * Remove parameters with the specified key
	 *
	 * 移除指定参数
	 * @param key parameter key / 参数键
	 */
	removeParams(key: string): void;

	/**
	 * Get parameter values
	 *
	 * 获取参数值
	 * @param key parameter key / 参数键
	 */
	getValues(key: string): string[];

	/**
	 * Insert an parameter
	 *
	 * 插入参数
	 * @param key parameter key / 参数键
	 * @param value parameter value / 参数值
	 */
	newParam(key: string, value: string): ParamLineToken;

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param key parameter key / 参数键
	 * @param value parameter value / 参数值
	 */
	setValue(key: string, value: string): void;

	/**
	 * Count duplicated parameters
	 *
	 * 重复参数计数
	 */
	hasDuplicatedParams(): number;
}

/**
 * 子节点为ParamLineToken的类
 * @ignore
 */
export const paramLineParent = <T extends AstConstructor>(constructor: T): T => {
	LINT: {
		abstract class ParamLineParent extends constructor implements ParamLineParent {
			declare readonly childNodes: readonly ParamLineToken[];

			getKeys(): Set<string> {
				return new Set(this.childNodes.map(({key}) => key).filter((key): key is string => key !== undefined));
			}

			getParams(key: string): ParamLineToken[] {
				return this.childNodes.filter(({key: k}) => k === key);
			}

			getDuplicatedParams(): [string, ParamLineToken[]][] {
				return [...this.getKeys()].map((key): [string, ParamLineToken[]] => [key, this.getParams(key)])
					.filter(([, {length}]) => length > 1);
			}

			override lint(start = this.getAbsoluteIndex()): LintError[] {
				const errors = super.lint(start),
					{name, firstChild} = this,
					rule = 'no-duplicate',
					{lintConfig} = Parser,
					s = lintConfig.getSeverity(rule, name);
				if (s) {
					const msg = Parser.msg('duplicate-ext-parameter', name),
						rect = new BoundingRect(this as unknown as Token, start),
						{computeEditInfo} = lintConfig;
					for (const [, params] of this.getDuplicatedParams()) {
						Array.prototype.push.apply(
							errors,
							params.map(param => {
								const e = generateForChild(param, rect, rule, msg, s);
								if (computeEditInfo) {
									e.suggestions = [fixByRemove(e, param === firstChild ? 0 : -1)];
								}
								return e;
							}),
						);
					}
				}
				return errors;
			}

			/* NOT FOR BROWSER */

			hasParam(key: string): boolean {
				return this.childNodes.some(({key: k}) => k === key);
			}

			removeParams(key: string): void {
				for (const param of this.getParams(key)) {
					param.remove();
				}
			}

			getValues(key: string): string[] {
				return this.getParams(key).map(({value}) => value!);
			}

			newParam(key: string, value: string): ParamLineToken {
				return this.insertAt(
					// @ts-expect-error abstract class
					Shadow.run(() => new ParamLineToken(
						this.name,
						`${key}=${value}`,
						this.getAttribute('config'),
					)),
				) as ParamLineToken;
			}

			setValue(key: string, value: string): void {
				const params = this.getParams(key);
				if (params.length === 0) {
					this.newParam(key, value);
				} else {
					for (const param of params) {
						param.setValue(value);
					}
				}
			}

			hasDuplicatedParams(): number {
				return this.childNodes.filter(({key}) => key !== undefined).length - this.getKeys().size;
			}
		}
		mixin(ParamLineParent, constructor);
		return ParamLineParent;
	}
};

mixins['paramLineParent'] = __filename;
