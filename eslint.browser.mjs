import {dist} from '@bhsd/code-standard';

export default [
	dist,
	{
		rules: {
			'es-x/no-array-prototype-at': 0,
			'es-x/no-string-prototype-at': 0,
		},
	},
];
