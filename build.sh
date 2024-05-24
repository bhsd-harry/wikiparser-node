#!/usr/local/bin/bash
rm -rf dist/
tsc && npm run declaration
if [[ $? -eq 0 ]]
then
	rm dist/internal.js dist/[abptu]*/*.d.ts
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
