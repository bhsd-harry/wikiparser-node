#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
	npm i --package-lock-only
	npm publish --tag ${3-latest}
	git add -A
	git commit -m "chore: publish v$1 to npm"
else
	npm run lint
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1-m"
		git push
		git tag v$1-m
		git push origin v$1-m
	fi
fi
