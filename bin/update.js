'use strict';

const fs = require('fs');

fs.writeFileSync(
	'./package.json',
	`${JSON.stringify({...require('../package'), types: './dist/index.d.ts'}, null, '\t')}\n`,
);
