import {node, extend} from '@bhsd/code-standard';
import markdown from '@eslint/markdown';

export default extend(
	...node,
	{
		ignores: [
			'**/*.ts',
			'**/*.cjs',
			'**/*.mjs',
		],
	},
	{
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					impliedStrict: true,
				},
			},
			globals: {
				assert: 'readonly',
				Parser: 'readonly',
				wikiparse: 'readonly',
			},
		},
		rules: {
			'class-methods-use-this': 0,
			'no-unused-vars': [
				2,
				{
					varsIgnorePattern: '^Parser$',
				},
			],
			'no-var': 0,
			'n/no-missing-require': 0,
			'@stylistic/max-len': [
				2,
				{
					ignoreTemplateLiterals: true,
					code: 80,
				},
			],
			'@stylistic/quotes': [
				2,
				'single',
				{
					allowTemplateLiterals: 'always',
					avoidEscape: true,
				},
			],
		},
	},
	{
		files: [
			'**/*.md',
		],
		processor: markdown.processors.markdown,
	},
);
