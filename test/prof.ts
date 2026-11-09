import {readFileSync} from 'fs';
import single from './single';
import type {SimplePage} from '@bhsd/test-util';

/* NOT FOR BROWSER ONLY */

import {profile} from '@bhsd/nodejs';

/* NOT FOR BROWSER ONLY END */

import Parser from '../index';
Parser.config = require('../../config/default');

const content = readFileSync('test/page.wiki', 'utf8'),
	[,, count, method = ''] = process.argv;

(async () => {
	/* NOT FOR BROWSER ONLY */

	await profile(
		async () => {
			/* NOT FOR BROWSER ONLY END */

			for (let i = 0; i < (Number(count) || 10); i++) {
				const page: SimplePage = {content, ns: 0, pageid: 0, title: `Pass ${i}`};
				if (
					method !== 'lsp'
				) {
					await single(page, method);
				}
				console.log();
			}

			/* NOT FOR BROWSER ONLY */
		},

		'test',
	);

	/* NOT FOR BROWSER ONLY END */
})();
