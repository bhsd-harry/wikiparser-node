'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');
const [
	json,
	ts,
] = config.overrides;

module.exports = {
	...config,
	extends: [
		...config.extends,
		'plugin:markdown/recommended-legacy',
	],
	ignorePatterns: [
		...config.ignorePatterns,
		'coverage/',
		'/bundle/',
		'/extensions/es7/',
	],
	rules: {
		...config.rules,
		'no-control-regex': 0,
		'no-bitwise': [
			2,
			{
				allow: [
					'<<',
				],
			},
		],
		'no-new': 0,
		'no-restricted-globals': [
			2,
			'self',
			'Range',
			'print',
			'escape',
			'close',
			'closed',
			'constructor',
			'length',
			'name',
			'open',
			'parent',
			'root',
			'stop',
			'top',
		],
		'no-param-reassign': 0,
		'no-shadow': [
			2,
			{
				builtinGlobals: false,
			},
		],
		'prefer-object-has-own': 0,
		'@stylistic/max-len': [
			2,
			{
				ignoreRegExpLiterals: true,
				ignoreComments: true,
				code: 120,
			},
		],
		'n/exports-style': [
			2,
			'exports',
		],
		'n/no-unpublished-bin': 0,
		'unicorn/no-this-assignment': 0,
		'jsdoc/require-jsdoc': [
			1,
			{
				...config.rules['jsdoc/require-jsdoc'][1],
				require: {
					ArrowFunctionExpression: true,
					ClassDeclaration: true,
					FunctionDeclaration: false,
					FunctionExpression: true,
					MethodDefinition: false,
				},
			},
		],
		'jsdoc/require-param-description': 0,
		'jsdoc/require-param': [
			1,
			{
				contexts: [
					'FunctionDeclaration',
					'VariableDeclarator > FunctionExpression',
					'MethodDefinition > FunctionExpression',
					'VariableDeclarator > ArrowFunctionExpression',
				],
				checkConstructors: false,
			},
		],
	},
	overrides: [
		{
			...json,
			excludedFiles: [
				'test/parserTests.json',
			],
		},
		{
			files: [
				'errors/*.json',
				'printed/*.json',
			],
			rules: {
				'@stylistic/eol-last': [
					2,
					'never',
				],
				'@stylistic/indent': 0,
			},
		},
		{
			files: 'wiki/*.md/**',
			globals: {
				assert: 'readonly',
				Parser: 'readonly',
				wikiparse: 'readonly',
			},
			rules: {
				'no-var': 0,
				'jsdoc/require-jsdoc': 0,
				'n/no-missing-require': 0,
				'@stylistic/max-len': [
					2,
					{
						ignoreTemplateLiterals: true,
						code: 80,
					},
				],
				'n/no-unsupported-features/node-builtins': 0,
			},
		},
		{
			...ts,
			rules: {
				...ts.rules,
				'@typescript-eslint/class-methods-use-this': [
					2,
					{
						ignoreOverrideMethods: true,
						exceptMethods: [
							'createTextNode',
							'createRange',
							'fixed',
							'getGaps',
						],
					},
				],
				'@typescript-eslint/no-shadow': [
					2,
					{
						builtinGlobals: false,
					},
				],
				'@typescript-eslint/explicit-function-return-type': [
					2,
					{
						allowIIFEs: true,
						allowedNames: [
							'flagsParent',
							'magicLinkParent',
							'sol',
						],
					},
				],
				'@typescript-eslint/no-namespace': 0,
				'@typescript-eslint/no-require-imports': 0,
				'@typescript-eslint/no-unsafe-declaration-merging': 0,
				'@typescript-eslint/no-unsafe-function-type': 0,
				'@typescript-eslint/related-getter-setter-pairs': 0,
			},
		},
		{
			files: [
				'test/*.ts',
			],
			rules: {
				'n/no-missing-require': 0,
			},
		},
		{
			files: '**/*.ts',
			excludedFiles: [
				'addon/*.ts',
				'bin/*.ts',
				'script/*.ts',
				'test/*.ts',
				'lib/lsp.ts',
			],
			plugins: [
				'es-x',
			],
			rules: {
				'es-x/no-array-prototype-flat': 2,
				'es-x/no-global-this': 2,
				'es-x/no-malformed-template-literals': 2,
				'es-x/no-regexp-s-flag': 2,
				'es-x/no-regexp-unicode-property-escapes': 2,
				'es-x/no-string-prototype-trimstart-trimend': 2,
			},
		},
		{
			files: '*.cjs',
			rules: {
				'n/exports-style': [
					2,
					'module.exports',
				],
				'@stylistic/array-bracket-newline': [
					2,
					{
						minItems: 1,
					},
				],
			},
		},
		{
			files: 'extensions/*.ts',
			parserOptions: {
				project: './extensions/tsconfig.json',
			},
		},
	],
	settings: {
		...config.settings,
		n: {
			...config.settings.n,
			allowModules: [
				'chalk',
				'monaco-editor',
			],
		},
		'es-x': {
			aggressive: true,
		},
	},
};
