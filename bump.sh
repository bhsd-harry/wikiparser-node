#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1-b\"/" package.json
	gsed -i 's|/gh/bhsd-harry/wikiparser-node|/npm/wikiparser-node|' extensions/base.ts
	npm publish --tag ${3-browser}
	git add -A
	git commit -m "chore: publish v$1-b to npm"
else
	npm run lint && npm run build:test && npm test && npm run test:parser && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s|const version = '.+';|const version = '$1';|" extensions/base.ts
		gsed -i 's|/npm/wikiparser-node|/gh/bhsd-harry/wikiparser-node|' extensions/base.ts
		npm run build:ext
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git push
		git tag v$1-b
		git push origin v$1-b
	fi
fi
