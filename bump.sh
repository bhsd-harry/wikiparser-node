#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm publish --tag "${3-latest}"
else
	npm run build && npm run lint && npm test && npm run test:real
	if [[ $? -eq 0 ]]
	then
		IFS='.' read major minor <<< "$1"
		version=$(( major + 1 )).$minor
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$version\"/" package.json
		npm i --package-lock-only
		git add -A
		git commit -m "chore: bump version to v$1-m"
		git push
		git tag "v$1-m"
		git push origin "v$1-m"
	fi
fi
