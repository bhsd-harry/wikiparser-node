import {mixin} from '../util/debug';
import {generateForChild, fixByRemove} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {ParamLineToken} from '../src/paramLine';
import type {LintError} from '../base';
import type {Token} from '../internal';

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
						const {length} = params,
							duplication = Array.from<LintError>({length});
						for (let i = length - 1; i >= 0; i--) {
							const param = params[i]!,
								e = generateForChild(param, rect, rule, msg, s);
							if (computeEditInfo) {
								e.suggestions = [fixByRemove(e, param === firstChild ? 0 : -1)];
							}
							duplication[i] = e;
						}
						Array.prototype.push.apply(errors, duplication);
					}
				}
				return errors;
			}
		}
		mixin(ParamLineParent, constructor);
		return ParamLineParent;
	}
};
