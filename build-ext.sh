#!/usr/local/bin/bash
rm -rf extensions/dist/
tsc --project extensions/tsconfig.json --module ES6
ls extensions/dist/*.js | xargs bash sed.sh -i '/export {};/d'
ls extensions/dist/*.js | grep -v 'gh-page' | xargs -I {} bash -c 'printf "%s\n%s\n%s\n" "(() => {" "$(cat $1)" "})();" > $1' -- {}
eslint --no-eslintrc -c .eslintrc.browser.json extensions/dist/