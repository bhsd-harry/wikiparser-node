#!/usr/local/bin/bash
npm run lint && npm run build:test && npm test && npm run test:parser && npm run test:real
if [[ $? -eq 0 ]]
then
	gsed -i -E "s|const version = '.+',|const version = '$1',|" extensions/base.ts
	npm run build:ext
	git add -A
	git commit -m "chore: bump version to v$1-b"
	git push
	git tag v$1-b
	git push origin v$1-b
fi
