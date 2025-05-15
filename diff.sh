#!/usr/local/bin/bash
if (( $# > 2 ))
then
	git diff --ignore-all-space --color-moved --minimal "$@"
else
	git diff --ignore-all-space --color-moved --minimal "$@" -- *.ts \
	bin/ \
	config/ data/ i18n/ lib/ mixin/ parser/ src/ test/ util/
fi
