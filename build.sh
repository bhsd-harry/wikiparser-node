#!/usr/local/bin/bash

rm -rf dist/
tsc && \
npx esbuild ./base.ts ./util/sharable.ts --charset=utf8 --target=es2023 --format=esm --outdir=dist --out-extension:.js=.mjs
if [[ $? -eq 0 ]]
then
	mv dist/util/sharable.d.ts dist/util/sharable.d.mts
	rm dist/internal.js dist/[abptu]*/*.d.ts dist/script/*.d.ts
	grep -rl --include='*.d.ts' '@private' dist/ | xargs bash sed.sh -i -E '/^\s+\/\*\* @private/,+1d'
	grep -rl --include='*.d.ts' '/util/' dist/ | xargs bash sed.sh -i -E '/^import .+\/util\//d'
	grep -rl --include='*.d.ts' '/parser/' dist/ | xargs bash sed.sh -i -E '/^import .+\/parser\//d'
	bash sed.sh -i -E 's/abstract (lint|print|text)\b/\1/' dist/lib/node.d.ts
	node dist/script/declaration.js # dist/src/**/*.d.ts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type WikiParserAcceptable = Record<string, any>; }' >> dist/index.d.ts
	bash sed.sh -i '/export = Parser/i \
// @ts-expect-error mixed export styles' dist/index.d.ts
	cp dist/base.d.ts dist/base.d.mts
	err=$(tsc --project tsconfig.dist.json 2>&1)
	if [[ -n $err ]]
	then
		echo "$err"
		exit 1
	fi
else
	exit $?
fi
