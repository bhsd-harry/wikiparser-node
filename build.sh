#!/usr/local/bin/bash
rm -rf dist/
tsc && npm run declaration
if [[ $? -eq 0 ]]
then
	err=$(tsc --project tsconfig.dist.json 2>&1 | bash sed.sh -E '/error TS(1244|2309|18052):/d')
	if [[ -n $err ]]
	then
		echo $err
		exit 1
	fi
else
	exit $?
fi
