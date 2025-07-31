#!/usr/local/bin/bash

rm -rf dist/
tsc
if [[ $? -eq 0 ]]
then
	rm dist/[ptu]*/*.d.ts
	grep -rl --include='*.d.ts' '@private' dist/ | xargs bash sed.sh -i -E '/^\s+\/\*\* @private/,+1d'
	grep -rl --include='*.d.ts' '/util/' dist/ | xargs bash sed.sh -i -E '/^import .+\/util\//d'
	bash sed.sh -i -E 's/abstract (lint|print|text)\b/\1/' dist/lib/node.d.ts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global { type Acceptable = Record<string, any>; }' >> dist/index.d.ts
else
	exit $?
fi
