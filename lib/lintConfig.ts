import {rules} from '../base';
import type {LintError} from '../base';

declare type SeverityLevel = 0 | 1 | 2;
declare type LintConfigValue = SeverityLevel | [SeverityLevel, Record<string, unknown>];
declare type LintConfig = Partial<Record<LintError.Rule, LintConfigValue>>;
export interface LintConfiguration extends LintConfig {
	/** @private */
	getSeverity(rule: LintError.Rule, key?: string): LintError.Severity | false;
}

const severities = new Set([0, 1, 2]),
	dict = new Map<SeverityLevel, LintError.Severity | false>([
		[0, false],
		[1, 'warning'],
		[2, 'error'],
	]);

const defaultLintConfig: LintConfig = {
	'no-ignored': [
		2,
		{
			redirect: 1,

			// choose: 2,
			// combobox: 2,
			// dynamicpagelist: 2,
			// inputbox: 2,
			// references: 2,
		},
	],
	'unclosed-comment': [
		1,
		{},
	],
	unescaped: 2,
	'void-ext': [
		2,
		{
			// languages: 2,
			// templatestyles: 2,
			// section: 2,
		},
	],
};
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
export class LintConfiguration implements LintConfig {
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

	/** @implements */
	getSeverity(rule: LintError.Rule, key?: string): LintError.Severity | false {
		const value = this[rule]!;
		if (typeof value === 'number') {
			return dict.get(value)!;
		}
		return key ? dict.get(value[1][key] as SeverityLevel) ?? dict.get(value[0])! : dict.get(value[0])!;
	}
}

/**
 * 获取语法检查设置
 * @param config 语法检查设置
 */
export const getLintConfig = (config?: LintConfig): LintConfiguration =>
	new Proxy(new LintConfiguration(config), {set}) as LintConfiguration;
