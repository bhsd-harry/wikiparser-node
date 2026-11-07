#!/usr/bin/env bash

rm -rf dist/
tsc
if [[ $? -eq 0 ]]
then
	rm dist/internal.js dist/[abprtuv]*/*.d.ts dist/script/*.d.ts
	grep -rl --include='*.d.ts' '@private' dist/ | xargs bash sed.sh -i -E '/^\s+\/\*\* @private/,+1d'
	grep -rl --include='*.d.ts' '/util/' dist/ | xargs bash sed.sh -i -E '/^import .+\/util\//d'
	bash sed.sh -i -E 's/abstract (lint|print|text)\b/\1/' dist/lib/node.d.ts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type WikiParserAcceptable = Record<string, any>; }' >> dist/index.d.ts
	err=$(tsc -p tsconfig.dist.json 2>&1)
	if [[ -n $err ]]
	then
		echo "$err"
		exit 1
	fi
else
	exit $?
fi
