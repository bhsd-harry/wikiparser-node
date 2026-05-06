import {readFileSync} from 'fs';
import single from './single';
import type {SimplePage} from '@bhsd/test-util';

/* NOT FOR BROWSER ONLY */

import {registerHooks} from 'module';
import {profile} from '@bhsd/nodejs';
import lsp from './lsp';
import {resolve} from './hooks';

registerHooks({resolve});

/* NOT FOR BROWSER ONLY END */

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
				if (!method || method === 'lsp') {
					await lsp(page);
				}
				console.log();
			}

			/* NOT FOR BROWSER ONLY */
		},

		'test',
	);

	/* NOT FOR BROWSER ONLY END */
})();
