#!/usr/local/bin/bash
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
