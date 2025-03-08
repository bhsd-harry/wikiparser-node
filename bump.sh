#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm publish --tag "${3-latest}"
else
	npm run lint && npm run build && npm test && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		npm i --package-lock-only
		git add -A
		git commit -m "chore: bump version to v$1"
		git push
		git tag "v$1"
		git push origin "v$1"
	fi
fi
