#!/usr/local/bin/bash
if (( $# > 2 ))
then
	git diff --ignore-all-space --color-moved --minimal "$@"
else
	git diff --ignore-all-space --color-moved --minimal --diff-filter=ad "$@" -- *.ts \
	bin/ \
	config/ data/ i18n/ lib/ mixin/ parser/ src/ test/ typings/ util/ \
	| diff2html -i stdin -F diff.html
fi
