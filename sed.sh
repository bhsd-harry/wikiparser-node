#!/usr/local/bin/bash

function is_gnu_sed() {
	sed --version >/dev/null 2>&1
}

if is_gnu_sed
then
	sed "$@"
else
	gsed "$@"
fi
