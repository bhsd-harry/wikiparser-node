#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm view wikiparser-node@$1-b
	if [[ $? -eq 0 ]]
	then
		git checkout browser bundle/bundle.min.js extensions/dist/*.js extensions/*.css
		gsed -i 's/$VERSION-b/$VERSION/' extensions/dist/base.js
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		npm i --package-lock-only
		npm publish --tag ${3-latest}
		rm bundle/bundle.min.js extensions/dist/*.js extensions/*.css
		git add -A
		git commit -m "chore: publish v$1 to npm"
	fi
else
	npm run lint && npm run build && npm test && npm run test:parser && npm run test:real
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1"
		git push
		git tag v$1
		git push origin v$1
	fi
fi
