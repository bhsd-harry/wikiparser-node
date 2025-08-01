#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm publish --tag "${3-latest}"
else
	npm run build && npm run lint && npm test && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		git add -A
		git commit -m "chore: bump version to v$1"
		git push
	fi
fi
