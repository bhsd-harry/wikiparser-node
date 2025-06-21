#!/usr/local/bin/bash

rm -rf dist/
tsc && npm run declaration && \
npx esbuild ./base.ts ./util/sharable.ts --charset=utf8 --target=es2023 --format=esm --outdir=dist --out-extension:.js=.mjs
if [[ $? -eq 0 ]]
then
	mv dist/util/sharable.d.ts dist/util/sharable.d.mts
	rm dist/internal.js dist/[abptu]*/*.d.ts dist/script/*.d.ts
	cp dist/base.d.ts dist/base.d.mts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type Acceptable = Record<string, any>; }' >> dist/index.d.ts
	bash sed.sh -i '/export = Parser/i \
// @ts-expect-error mixed export styles' dist/index.d.ts
	err=$(tsc --project tsconfig.dist.json 2>&1)
	if [[ -n $err ]]
	then
		echo "$err"
		exit 1
	fi
else
	exit $?
fi
