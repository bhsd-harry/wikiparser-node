import {
	readFileSync,

	/* NOT FOR BROWSER ONLY */

	writeFileSync,
} from 'fs';
import single from './single';

/* NOT FOR BROWSER ONLY */

import inspector from 'inspector';
import lsp from './lsp';

/* NOT FOR BROWSER ONLY END */

const content = readFileSync('test/page.wiki', 'utf8'),
	session = new inspector.Session(),
	{argv: [,, count, method]} = process;
session.connect();
session.post('Profiler.enable', () => {
	session.post('Profiler.start', () => {
		(async () => {
			for (let i = 0; i < (Number(count) || 20); i++) {
				const page: SimplePage = {content, ns: 0, pageid: 0, title: `Pass ${i}`};
				if (
					method !== 'lsp'
				) {
					await single(page, method);
				}

				/* NOT FOR BROWSER ONLY */

				if (!method || method === 'lsp') {
					await lsp(page);
				}

				/* NOT FOR BROWSER ONLY END */

				console.log();
			}

			/* NOT FOR BROWSER ONLY */

			session.post('Profiler.stop', (_, {profile: {nodes}}) => {
				const useful = nodes.filter(({callFrame: {url}}) => url.startsWith('file:///'));
				writeFileSync('test/prof.txt', JSON.stringify(useful, null, '\t'));
				session.disconnect();
			});
		})();
	});
});
