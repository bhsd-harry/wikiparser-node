import {rules} from '../base';
import type {LintError} from '../base';

/* NOT FOR BRWOSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

declare type SeverityLevel = 0 | 1 | 2;
declare type LintConfigValue = SeverityLevel | [SeverityLevel, Record<string, unknown>];
export type LintConfig = Partial<Record<LintError.Rule, LintConfigValue>>;

const severities = new Set([0, 1, 2]);

const defaultLintConfig: LintConfig = {};
Object.freeze(defaultLintConfig);

/**
 * 验证错误级别是否符合规范
 * @param severity 错误级别
 */
const validateSeverity = (severity: unknown): boolean => typeof severity === 'number' && severities.has(severity);

/**
 * 验证设置值是否符合规范
 * @param value 设置值
 */
const validateConfigValue = (value: unknown): boolean => validateSeverity(value)
	|| Array.isArray(value) && value.length === 2
	&& validateSeverity(value[0]) && value[1] && typeof value[1] === 'object';

/**
 * 设置语法检查规则
 * @param obj 语法检查设置对象
 * @param key 语法检查规则
 * @param value 语法检查规则值
 * @throws `RangeError` 未知的规则或无效的值
 */
const set = (obj: LintConfig, key: LintError.Rule, value: LintConfigValue): boolean => {
	if (!rules.includes(key)) {
		throw new RangeError(`Unknown lint rule: ${key}`);
	} else if (validateConfigValue(value)) {
		obj[key] = value;
		return true;
	}
	throw new RangeError(`Invalid lint config for ${key}: ${JSON.stringify(value)}`);
};

/** 语法检查设置 */
class LintConfiguration implements LintConfig {
	/** @param config 语法检查设置 */
	constructor(config?: LintConfig) {
		Object.assign(
			this,
			structuredClone(
				defaultLintConfig,
			),
		);
		if (!config) {
			return;
		}
		for (const [key, value] of Object.entries(config) as [LintError.Rule, LintConfigValue][]) {
			set(this, key, value);
		}
	}
}

/**
 * 获取语法检查设置
 * @param config 语法检查设置
 */
export const getLintConfig = (config?: LintConfig): LintConfig => new Proxy(new LintConfiguration(config), {set});

classes['LintConfiguration'] = __filename;
