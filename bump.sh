#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1-b\"/" package.json
	git add -A
	git commit -m "chore: publish v$1-b to npm"
	git push
	npm publish --tag browser
else
	rm bundle/*.js
	webpack
	eslint . && stylelint extensions/*.css
	if [[ $? -eq 0 ]]
	then
		sed -i '' -E "s|wikiparser-node@.+-b/bundle/|wikiparser-node@$1-b/bundle/|" extensions/editor.js
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git push
		git tag v$1-b
		git push origin v$1-b
	fi
fi
