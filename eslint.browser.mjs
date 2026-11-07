import {dist, distES10} from '@bhsd/code-standard';

export default [
	dist,
	{
		files: [
			'bundle/bundle-es*.min.js',
		],
		languageOptions: {
			ecmaVersion: 10,
		},
		rules: {
			...distES10.rules,
			'es-x/no-global-this': 0,
		},
	},
];
