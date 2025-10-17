#!/usr/local/bin/bash
if (( $(ls -1q errors/* | wc -l) > 1 ))
then
	echo 'There are remaining error files in the "errors/" directory. Please resolve them before proceeding.'
	exit 1
fi
if [[ $2 == 'npm' ]]
then
	if [[ $(git tag -l "v$1-b") ]]
	then
		git checkout temp-browser bundle/bundle{,-lsp}.min.js extensions/dist/*.js extensions/*.css
		npm publish --tag beta
		rm bundle/bundle{,-lsp}.min.js extensions/dist/*.js extensions/*.css
	else
		echo "Tag v$1-b not found"
		exit 1
	fi
else
	npm run build && npm run lint && npm run test:parser && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		npm i --package-lock-only
		git add -A
		git commit -m "chore: bump version to v$1"
		git tag "v$1"
		git push origin "v$1"
	fi
fi
