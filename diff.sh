#!/usr/local/bin/bash
if (( $# > 2 ))
then
	git diff -w --color-moved --minimal "$@"
else
	git diff -w --color-moved --minimal --diff-filter=ad "$@" -- *.ts \
	addon/ \
	config/ lib/ mixin/ parser/ src/ test/ typings/ util/ \
	| diff2html -i stdin -F diff.html
fi
