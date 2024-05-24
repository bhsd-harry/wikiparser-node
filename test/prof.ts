import {readFileSync} from 'fs';
import {single} from './single';
import '../../bundle/bundle.min.js';
import type {Parser as ParserBase} from '../base';

declare const Parser: ParserBase;

const content = readFileSync('test/page.wiki', 'utf8');
void single(Parser, {content, ns: 0, pageid: 0, title: 'Prof'});
