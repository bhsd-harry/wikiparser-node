#!/usr/local/bin/bash
npm run build && npm run lint && npm run test:parser && npm run test:real
if [[ $? -eq 0 ]]
then
	gsed -i -E "s|const version = '.+',|const version = '$1',|" extensions/base.ts
	npm run build:ext
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to v$1-b"
		git tag "v$1-b"
		git push origin "v$1-b"
	fi
fi
