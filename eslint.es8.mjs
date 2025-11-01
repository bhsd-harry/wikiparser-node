import {dist} from '@bhsd/code-standard';
import esX from 'eslint-plugin-es-x';

export default [
	dist,
	{
		rules: {
			...esX.configs['flat/restrict-to-es2017'].rules,
			'es-x/no-global-this': 0,
			'es-x/no-regexp-unicode-property-escapes': 0,
		},
	},
];
