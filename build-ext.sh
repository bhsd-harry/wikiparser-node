#!/usr/local/bin/bash
rm -rf extensions/dist/
bash sed.sh -i -E "s|(import type .+ from '../base';)|// \1|" extensions/typings.d.ts
tsc --project extensions/tsconfig.json --module ES6 --noImplicitAny false
tsc --project extensions/tsconfig.es7.json --module ES6 --noImplicitAny false
tsc --project extensions/tsconfig.codejar.json --module ES2020 --noImplicitAny false
bash sed.sh -i 's|bundle.lsp.js|bundle.es7.js|' extensions/es7/base.js
bash sed.sh -i -E "s|// (import type .+ from '../base';)|\1|" extensions/typings.d.ts
for x in extensions/*/*.js
do
	if [[ $x != 'extensions/dist/gh-page.js' ]]
	then
		bash sed.sh -i '/export {};/d' "$x"
		printf '%s\n%s\n%s\n' '(() => {' "$(cat $x)" '})();' > "$x"
	fi
done
eslint --no-eslintrc -c .eslintrc.browser.cjs extensions/dist/
eslint --no-eslintrc -c .eslintrc.es7.cjs extensions/es7/
