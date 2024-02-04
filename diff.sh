#!/usr/local/bin/bash
if (( $# > 2 ))
then
	git diff --ignore-all-space --color-moved "$@"
else
	git diff --ignore-all-space --color-moved "$@" *.ts [cilmpstu]*/
fi
