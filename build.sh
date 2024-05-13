#!/usr/local/bin/bash
rm -rf dist/
tsc && npm run declaration
if [[ $? -eq 0 ]]
then
	rm dist/internal.js dist/[btpu]*/*.d.ts
	bash sed.sh -i '/export declare const /,$d' dist/mixin/*.d.ts
	echo 'declare global {
	type Acceptable = unknown;
	type PrintOpt = unknown;
}' >> dist/index.d.ts
	err=$(tsc --project tsconfig.dist.json 2>&1 | bash sed.sh -E '/error TS2309:/d')
	if [[ -n $err ]]
	then
		echo $err
		exit 1
	fi
else
	exit $?
fi
