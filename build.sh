#!/usr/local/bin/bash

function esbuild {
	npx esbuild $1 --charset=utf8 --target=es2023 --format=esm --outfile=dist/$2
}

rm -rf dist/
tsc && npm run declaration && esbuild ./base.ts base.mjs && esbuild ./util/sharable.ts util/sharable.mjs
if [[ $? -eq 0 ]]
then
	mv dist/util/sharable.d.ts .
	rm dist/internal.js dist/[abptu]*/*.d.ts
	cp sharable.d.ts dist/util/sharable.d.mts
	mv sharable.d.ts dist/util/
	cp dist/base.d.ts dist/base.d.mts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type Acceptable = unknown; }' >> dist/index.d.ts
	bash sed.sh -i '/export = Parser/i \
// @ts-expect-error mixed export styles' dist/index.d.ts
	err=$(tsc --project tsconfig.dist.json 2>&1)
	if [[ -n $err ]]
	then
		echo $err
		exit 1
	fi
else
	exit $?
fi
