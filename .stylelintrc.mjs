import config from '@bhsd/code-standard/stylelint';

export default {
	...config,
	ignoreFiles: [
		'extensions/ui.css',
	],
	rules: {
		...config.rules,
		'selector-no-deprecated': [
			true,
			{
				ignoreSelectors: [
					'center',
				],
			},
		],
	},
};
