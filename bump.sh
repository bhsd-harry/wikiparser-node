#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1-b\"/" package.json
	gsed -i 's|/gh/bhsd-harry/wikiparser-node|/npm/wikiparser-node|' extensions/base.ts
	npm publish --tag browser
	git add -A
	git commit -m "chore: publish v$1-b to npm"
else
	npm run lint && npm run build:test && npm test && npm run test:parser && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s|wikiparser-node@.+-b|wikiparser-node@$1-b|" extensions/base.ts
		gsed -i 's|/npm/wikiparser-node|/gh/bhsd-harry/wikiparser-node|' extensions/base.ts
		npm run build:ext
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git push
		git tag v$1-b
		git push origin v$1-b
	fi
fi
