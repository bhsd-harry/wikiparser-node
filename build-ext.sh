#!/usr/local/bin/bash
rm -rf extensions/dist/
bash sed.sh -i -E "s|(import type .+ from '../base';)|// \1|" extensions/typings.d.ts
tsc -p extensions/tsconfig.json -m ES6 --noImplicitAny false
tsc -p extensions/tsconfig.codejar.json -m ES2020 --noImplicitAny false
bash sed.sh -i -E "s|// (import type .+ from '../base';)|\1|" extensions/typings.d.ts
for x in extensions/*/*.js
do
	if [[ ! "$x" =~ extensions/dist/.+-page.*\.js ]]
	then
		bash sed.sh -i '/export {};/d' "$x"
		printf '%s\n%s\n%s\n' '(() => {' "$(cat "$x")" '})();' > "$x"
	fi
done
eslint --no-config-lookup -c eslint.browser.mjs extensions/dist/
