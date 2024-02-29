#!/usr/local/bin/bash
rm -rf extensions/dist/
gsed -i -E "s|(import type .+ from '../base';)|// \1|" extensions/typings.d.ts
tsc --project extensions/tsconfig.json --module ES6 --noImplicitAny false
gsed -i -E "s|// (import type .+ from '../base';)|\1|" extensions/typings.d.ts
for x in extensions/dist/*.js
do
	if [[ $x != 'extensions/dist/gh-page.js' ]]
	then
		gsed -i '/export {};/d' $x
		printf '%s\n%s\n%s\n' '(() => {' "$(cat $x)" '})();' > $x
	fi
done
eslint --no-eslintrc -c .eslintrc.browser.json extensions/dist/