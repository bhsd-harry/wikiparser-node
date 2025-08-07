#!/usr/local/bin/bash

rm -rf dist/
tsc && \
npm run bundle:core && \
esbuild build/bundle-template.js --charset=utf8 --minify --target=es2017 --sourcemap --outfile=bundle/bundle.min.js && \
eslint --no-eslintrc -c .eslintrc.es8.cjs bundle/bundle.min.js
if [[ $? -eq 0 ]]
then
	rm dist/[ptu]*/*.d.ts
	grep -rl --include='*.d.ts' '@private' dist/ | xargs bash sed.sh -i -E '/^\s+\/\*\* @private/,+1d'
	grep -rl --include='*.d.ts' '/util/' dist/ | xargs bash sed.sh -i -E '/^import .+\/util\//d'
	grep -rl --include='*.d.ts' '/parser/' dist/ | xargs bash sed.sh -i -E '/^import .+\/parser\//d'
	bash sed.sh -i -E 's/abstract (lint|print|text)\b/\1/' dist/lib/node.d.ts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type WikiParserAcceptable = Record<string, any>; }' >> dist/index.d.ts
else
	exit $?
fi
