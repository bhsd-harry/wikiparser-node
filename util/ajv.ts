import fs from 'fs';
import type * as AjvLib from 'ajv';
import type AjvErrors from 'ajv-errors';

/**
 * 验证JSON数据并返回错误信息
 * @param schemaPath JSON Schema文件路径
 * @param dataVar 错误信息前缀
 */
export default (schemaPath: string, dataVar = '#'): (data: unknown) => string => {
	const schema: AjvLib.SchemaObject = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
	const Ajv: typeof AjvLib.default =
		require(schema.$schema?.includes('draft-07') ? 'ajv' : 'ajv/dist/2020'),
		ajvErrors: typeof AjvErrors = require('ajv-errors');
	const ajv = new Ajv({allErrors: true});
	ajvErrors(ajv, {singleError: true});
	ajv.addKeyword('markdownDescription');
	const v = ajv.compile(schema);
	return data => {
		if (v(data)) {
			return '';
		}
		const errors = v.errors!,
			{instancePath} = errors[0]!,
			related = errors.filter(error => error.instancePath === instancePath);
		return ajv.errorsText(
			[related.find(({keyword}) => keyword === 'errorMessage') || related[0]!],
			{dataVar},
		);
	};
};
