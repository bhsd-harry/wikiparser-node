import * as inspector from 'inspector';
import {readFileSync, writeFileSync} from 'fs';
import {single} from './single';
import Parser = require('../index');

/* NOT FOR BROWSER */

Parser.viewOnly = true;

/* NOT FOR BROWSER END */

const content = readFileSync('test/page.wiki', 'utf8');

const session = new inspector.Session();
session.connect();
session.post('Profiler.enable', () => {
	session.post('Profiler.start', () => {
		for (let i = 0; i < 10; i++) {
			void single(Parser, {content, ns: 0, pageid: 0, title: `Pass ${i}`});
		}
		session.post('Profiler.stop', (_, {profile}) => {
			writeFileSync('test/prof.txt', JSON.stringify(profile, null, '\t'));
			session.disconnect();
		});
	});
});
