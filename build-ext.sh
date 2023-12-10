rm -rf extensions/dist/
tsc --project extensions/tsconfig.json
ls extensions/dist/*.js | xargs gsed -i '/export {};/d'
ls extensions/dist/*.js | xargs -I {} bash -c 'printf "%s\n%s\n%s\n" "(() => {" "$(cat $1)" "})();" > $1' -- {}
eslint --no-eslintrc -c .eslintrc.browser.json extensions/dist/