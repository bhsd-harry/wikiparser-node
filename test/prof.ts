import * as inspector from 'inspector';
import {readFileSync, writeFileSync} from 'fs';
import single from './single';
import lsp from './lsp';
import Parser = require('../index');

const content = readFileSync('test/page.wiki', 'utf8'),
	session = new inspector.Session(),
	{argv: [,, count]} = process;
session.connect();
session.post('Profiler.enable', () => {
	session.post('Profiler.start', () => {
		(async () => {
			for (let i = 0; i < (Number(count) || 10); i++) {
				const page: SimplePage = {content, ns: 0, pageid: 0, title: `Pass ${i}`};
				void single(
					Parser,
					page,
				);
				await lsp(Parser, page);
			}
			session.post('Profiler.stop', (_, {profile}) => {
				writeFileSync('test/prof.txt', JSON.stringify(profile.nodes, null, '\t'));
				session.disconnect();
			});
		})();
	});
});
