import Ranges = require('../lib/ranges');
import Token = require('../src');
import AstText = require('../lib/text');
import ParameterToken = require('../src/parameter');
import {ParserConfig, accum} from './token';

export interface printOpt {
	pre?: string;
	post?: string;
	sep?: string;
	class?: string;
}
