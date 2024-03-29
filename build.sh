#!/usr/local/bin/bash
rm -rf dist/
tsc && npm run declaration && node ./dist/bin/parserTests.js
if [[ $? -eq 0 ]]
then
	err=$(tsc --project tsconfig.dist.json 2>&1 | bash sed.sh -E '/error TS2309:/d')
	if [[ -n $err ]]
	then
		echo $err
		exit 1
	fi
else
	exit $?
fi
