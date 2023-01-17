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
	eslint .	
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git push
		git tag v$1-b
		git push origin v$1-b
	fi
fi
