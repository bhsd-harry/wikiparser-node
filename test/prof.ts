import {readFileSync} from 'fs';
import {single} from './single';
import Parser = require('../index');

/* NOT FOR BROWSER */

Parser.viewOnly = true;

/* NOT FOR BROWSER END */

const content = readFileSync('test/page.wiki', 'utf8');
void single(Parser, {content, ns: 0, pageid: 0, title: 'Prof'}, true);
