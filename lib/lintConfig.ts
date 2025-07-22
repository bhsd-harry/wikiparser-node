import {rules} from '../base';
import type {
	LintError,
	SeverityLevel,
	LintConfigValue,
	LintConfig,
	LintConfiguration as LintConfigurationBase,
} from '../base';

const severities = new Set([0, 1, 2]),
	dict = new Map<SeverityLevel, LintError.Severity | false>([
		[0, false],
		[1, 'warning'],
		[2, 'error'],
	]);

const defaultLintConfig: LintConfig = {
	'bold-header': [
		1,
		{
			// b: 1,
			// strong: 1,
		},
	],
	'format-leakage': [
		1,
		{
			// apostrophe: 1,
		},
	],
	'fostered-content': [
		1,
		{
			// transclusion: 1,
		},
	],
	h1: [
		1,
		{
			// html: 1,
		},
	],
	'illegal-attr': [
		2,
		{
			// tabindex: 2,
			// unknown: 2,
			// value: 2,
		},
	],
	'insecure-style': 2,
	'invalid-gallery': [
		2,
		{
			// image: 2,
			parameter: 1,
		},
	],
	'invalid-imagemap': [
		2,
		{
			// image: 2,
			// link: 2,
		},
	],
	'invalid-invoke': [
		2,
		{
			// function: 2,
			// name: 2,
		},
	],
	'invalid-isbn': 2,
	'lonely-apos': [
		1,
		{
			// word: 1,
		},
	],
	'lonely-bracket': [
		1,
		{
			// converter: 1,
			// double: 1,
			extLink: 2,
			// single: 1,
		},
	],
	'lonely-http': [
		1,
		{
			// ISBN: 1,
			// PMID: 1,
			// RFC: 1,
		},
	],
	'nested-link': [
		2,
		{
			// file: 2,
		},
	],
	'no-arg': 1,
	'no-duplicate': [
		2,
		{
			// attribute: 2,
			category: 1,
			id: 1,
			// imageParameter: 2,
			// parameter: 2,
			unknownImageParameter: 1,
		},
	],
	'no-ignored': [
		2,
		{
			// arg: 2,
			// closingTag: 2,
			// conversionFlag: 2,
			fragment: 1,
			galleryComment: 1,
			// galleryImage: 2,
			galleryNoImage: 1,
			include: 1,
			// invalidAttributes: 2,
			nonWordAttributes: 1,
			redirect: 1,

			// choose: 2,
			// combobox: 2,
			// dynamicpagelist: 2,
			// inputbox: 2,
			// references: 2,
		},
	],
	'obsolete-attr': 1,
	'obsolete-tag': 1,
	'parsing-order': [
		2,
		{
			// ext: 2,
			// heading: 2,
			// html: 2,
			templateInTable: 1,
		},
	],
	'pipe-like': [
		1,
		{
			double: 2,
			// link: 1,
			// td: 1,
		},
	],
	'table-layout': 1,
	'tag-like': [
		2,
		{
			disallowed: 1,
			invalid: 1,
		},
	],
	'unbalanced-header': 2,
	'unclosed-comment': [
		1,
		{
			// include: 1,
		},
	],
	'unclosed-quote': 1,
	'unclosed-table': 2,
	unescaped: 2,
	'unknown-page': 1,
	'unmatched-tag': [
		1,
		{
			// both: 1,
			// closing: 1,
			// conditional: 1,
			// opening: 1,
			// selfClosing: 1,
		},
	],
	'unterminated-url': [
		1,
		{
			// pipe: 1,
			// punctuation: 1,
		},
	],
	'url-encoding': [
		1,
		{
			// file: 1,
		},
	],
	'var-anchor': [
		1,
		{
			// extLink: 1,
			// ref: 1,
		},
	],
	'void-ext': [
		2,
		{
			// img: 2,
			// languages: 2,
			// section: 2,
			// templatestyles: 2,
		},
	],

	/* NOT FOR BROWSER ONLY */

	'invalid-css': [
		2,
		{
			warn: 1,
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
const set = (obj: LintConfigurationBase, key: LintError.Rule, value: LintConfigValue): boolean => {
	if (!rules.includes(key)) {
		throw new RangeError(`Unknown lint rule: ${key}`);
	} else if (validateConfigValue(value)) {
		obj[key] = value;
		return true;
	}
	throw new RangeError(`Invalid lint config for ${key}: ${JSON.stringify(value)}`);
};

/** 语法检查设置 */
export class LintConfiguration implements LintConfigurationBase {
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
	getSeverity(this: LintConfigurationBase, rule: LintError.Rule, key?: string): LintError.Severity | false {
		if (!(rule in this)) {
			throw new RangeError(`Unknown rule: ${rule}`);
		}
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
	new Proxy(new LintConfiguration(config), {set});
