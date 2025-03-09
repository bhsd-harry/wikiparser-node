#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	if [[ $(git tag -l "v$1-b") ]]
	then
		git checkout browser bundle/bundle.min.js bundle/bundle-lsp.min.js extensions/dist/*.js extensions/*.css
		npm publish --tag "${3-latest}"
		if [[ -z $3 ]]
		then
			npm dist-tag add "wikiparser-node@$1" browser
		fi
		rm bundle/bundle.min.js bundle/bundle-lsp.min.js extensions/dist/*.js extensions/*.css
	else
		echo "Tag v$1-b not found"
		exit 1
	fi
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
