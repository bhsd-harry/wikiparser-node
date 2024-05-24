import {readFileSync} from 'fs';
import {single} from './single';
import Parser = require('../index');

const content = readFileSync('test/page.wiki', 'utf8');
void single(Parser, {content, ns: 0, pageid: 0, title: 'Prof'});
