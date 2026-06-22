import path from 'path';
import {sanitize} from '../util/string';
import {parsers} from '../util/constants';

declare type InterfaceText = string | Record<string, string>;
declare interface TemplateDataParam {
	label?: InterfaceText;
	description?: InterfaceText;
	required?: boolean;
	suggested?: boolean;
	deprecated?: string | boolean;
	aliases?: string[];
	default?: InterfaceText;
	autovalue?: string;
	example?: InterfaceText;
	type?: 'unknown'
		| 'number'
		| 'string'
		| 'line'
		| 'boolean'
		| 'date'
		| 'url'
		| 'wiki-page-name'
		| 'wiki-file-name'
		| 'wiki-template-name'
		| 'wiki-user-name'
		| 'content'
		| 'unbalanced-wikitext';
	suggestedvalues?: string[];
}
declare interface TemplateData {
	description?: InterfaceText;
	params: Record<string, TemplateDataParam>;
	paramOrder?: string[];
}

/**
 * 将界面文本转化为安全的字符串
 * @param text 界面文本
 */
export const resolveInterfaceText = (text: InterfaceText): string =>
	typeof sanitize(text === 'string' ? text : Object.values(text)[0]!);

/**
 * 将界面文本转化为安全的dl元素
 * @param dt dt元素的文本
 * @param text dd元素的界面文本
 * @param code 是否将dd元素的文本包裹在code元素中
 */
export const resolveOptionalInterfaceText = (dt: string, text?: InterfaceText, code?: boolean): string =>
	text === undefined
		? ''
		: `<dt>${dt}</dt><dd>${code ? '<code>' : ''}${resolveInterfaceText(text)}${code ? '</code>' : ''}</dd>`;

/**
 * 验证模板数据并返回错误信息
 * @param data 模板数据
 */
const validate: (data: unknown) => string = (() => {
	try {
		const Ajv: typeof import('ajv').default = require('ajv'),
			ajvErrors: typeof import('ajv-errors').default = require('ajv-errors');
		const ajv = new Ajv({allErrors: true});
		ajvErrors(ajv, {singleError: true});
		ajv.addKeyword('markdownDescription');
		const v = ajv.compile(require(path.join('..', '..', 'data', 'ext', 'templatedata.json')));
		return data => {
			if (v(data)) {
				return '';
			}
			const errors = v.errors!,
				{instancePath} = errors[0]!,
				related = errors.filter(error => error.instancePath === instancePath);
			return ajv.errorsText(
				[related.find(({keyword}) => keyword === 'errorMessage') || related[0]!],
				{dataVar: 'templatedata'},
			);
		};
	} catch {
		return () => 'Cannot perform schema validation.';
	}
})();

/**
 * 使用Ajv验证模板数据
 * @param s 模板数据字符串
 */
export const validateTemplateData = (s: string): string | TemplateData => {
	let data: TemplateData;
	try {
		data = JSON.parse(s);
	} catch {
		return 'Syntax error in JSON.';
	}
	const error = validate(data);
	if (error) {
		return error;
	}
	const {params, paramOrder} = data;
	if (paramOrder) {
		const paramNames = Object.keys(params),
			notFound = paramNames.find(name => !paramOrder.includes(name));
		if (notFound) {
			return `Required property "paramOrder[${JSON.stringify(notFound)}]" not found.`;
		}
		const invalid = paramOrder.find(name => !params[name]);
		if (invalid) {
			return `Invalid value for property "paramOrder[${JSON.stringify(invalid)}]".`;
		}
	}
	return data;
};

parsers['validateTemplateData'] = __filename;
