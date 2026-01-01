#!/usr/local/bin/bash
if (( $(ls -1q errors/* | wc -l) > 1 ))
then
	echo 'There are remaining error files in the "errors/" directory. Please resolve them before proceeding.'
	exit 1
fi
if [[ $2 == 'npm' ]]
then
	if [[ $(git tag -l "v$1-b") ]]
	then
		git checkout browser bundle/bundle{,-lsp}.min.js extensions/dist/*.js extensions/*.css
		npm publish --tag "${3-latest}"
		if [[ -z $3 ]]
		then
			npm dist-tag add "wikiparser-node@$1" browser
		fi
		rm bundle/bundle{,-lsp}.min.js extensions/dist/*.js extensions/*.css
	else
		echo "Tag v$1-b not found"
		exit 1
	fi
elif [[ $2 == 'gh' ]]
then
	gsed -n "/## v$1/,/##/{/^## .*/d;/./,\$!d;p}" CHANGELOG.md > release-notes.md
	gh release create "v$1" --notes-file release-notes.md -t "v$1" --verify-tag --latest="${3-true}"
	rm release-notes.md
else
	npm run build && npm run lint && npm test && npm run test:real
	if [[ $? -eq 0 ]]
	then
		gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		rm package-lock.json
		npm i --package-lock-only
		git add -A
		git commit -m "chore: bump version to v$1"
		git push
		git tag "v$1"
		git push origin "v$1"
	fi
fi
