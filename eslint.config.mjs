import {
	jsDoc,
	node,
	extend,
} from '@bhsd/code-standard';

const [
	,
	options,
] = jsDoc.rules['jsdoc/require-jsdoc'];
options.require = {
	ArrowFunctionExpression: true,
	ClassDeclaration: true,
	FunctionDeclaration: false,
	FunctionExpression: true,
	MethodDefinition: false,
};
options.contexts = [
	'FunctionDeclaration:not(TSDeclareFunction + FunctionDeclaration)',
	'TSDeclareFunction:not(TSDeclareFunction + TSDeclareFunction)',
	'MethodDefinition:not('
	+ 'MethodDefinition:has(TSEmptyBodyFunctionExpression) + MethodDefinition,'
	+ "[kind='set'],"
	+ '[override=true]'
	+ ')',
];
options.checkSetters = false;
node.at(-1).settings.n.allowModules = [
	'chalk',
	'monaco-editor',
];

export default extend(
	jsDoc,
	...node,
	{
		ignores: [
			'.cache/',
			'.nyc_output/',
			'coverage/',
			'bundle/',
			'errors/',
			'printed/',
			'test/parserTests.json',
		],
	},
	{
		rules: {
			'grouped-accessor-pairs': 0,
			'no-control-regex': 0,
			'no-new': 0,
			'no-restricted-globals': [
				2,
				'escape',
				'close',
				'closed',
				'constructor',
				'length',
				'Location',
				'name',
				'open',
				'parent',
				'print',
				'Range',
				'self',
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
			'no-unused-labels': 0,
			'prefer-object-has-own': 0,
			'@stylistic/max-len': [
				2,
				{
					ignoreRegExpLiterals: true,
					ignoreComments: true,
					code: 120,
				},
			],
			'n/no-unpublished-bin': 0,
			'unicorn/no-this-assignment': 0,
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
	},
	{
		files: [
			'*.cjs',
			'*.mjs',
		],
		rules: {
			'@stylistic/array-bracket-newline': [
				2,
				{
					minItems: 1,
				},
			],
		},
	},
	{
		files: [
			'**/*.ts',
		],
		rules: {
			'n/no-unsupported-features/node-builtins': [
				2,
				{
					allowExperimental: true,
					ignores: [
						'util.styleText',
					],
				},
			],
			'@typescript-eslint/class-methods-use-this': [
				2,
				{
					ignoreOverrideMethods: true,
					exceptMethods: [
						'createTextNode',
						'createRange',
						'fixed',
						'escape',
						'getGaps',
						'provideColorPresentations',
						'provideCodeAction',
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
			'mixin/*.ts',
			'test/hooks.ts',
			'lib/attributes.ts',
		],
		rules: {
			'jsdoc/require-jsdoc': 0,
		},
	},
	{
		files: [
			'test/*.ts',
		],
		rules: {
			'n/no-missing-require': 0,
			'n/no-unsupported-features/node-builtins': [
				2,
				{
					allowExperimental: true,
					version: '>=24.0.0',
				},
			],
			'@typescript-eslint/strict-void-return': 0,
		},
	},
	{
		files: [
			'extensions/*.ts',
		],
		languageOptions: {
			parserOptions: {
				project: './extensions/tsconfig.json',
			},
		},
	},
);
