#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
	git add -A
	git commit -m "chore: publish v$1 to npm"
	npm publish
else
	npm run lint && npm run build
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1"
		git push
		git tag v$1
		git push origin v$1
	fi
fi
