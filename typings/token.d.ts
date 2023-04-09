import Token = require('../src');
import Ranges = require('../lib/ranges');

export type accum = Token[];
export type acceptable = Record<string, number|string|Ranges|(number|string)[]>;
