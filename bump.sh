#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	IFS='.' read major minor <<< "$1"
	version=$(( major + 1 )).$minor
	gsed -i -E "s/\"version\": \".+\"/\"version\": \"$version\"/" package.json
	npm i --package-lock-only
	npm publish --tag ${3-latest}
	git add -A
	git commit -m "chore: publish v$version to npm"
else
	npm run lint && npm run build && npm run test:real
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1-m"
		git tag v$1-m
		git push --follow-tags
	fi
fi
