#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1-b\"/" package.json
	npm publish --tag browser
	git add -A
	git commit -m "chore: publish v$1-b to npm"
else
	npm run lint && npm run build && npm run test:real
	if [[ $? -eq 0 ]]
	then
		sed -i '' -E "s|wikiparser-node@.+-b|wikiparser-node@$1-b|" extensions/base.ts
		npm run build
		sed -i '' -E "s|/npm/|/gh/bhsd-harry/|" extensions/dist/base.js
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git push
		git tag v$1-b
		git push origin v$1-b
	fi
fi
