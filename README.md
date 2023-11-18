[![npm version](https://badge.fury.io/js/wikilint.svg)](https://www.npmjs.com/package/wikilint)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql)

# wikilint
This is a minimal version of [wikiparser-node](https://www.npmjs.com/package/wikiparser-node) customized for [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext).

You can also directly lint Wikitext articles in the command line using this package:

```sh
npx wikilint --config zhwiki --include *.wiki
```

## CLI Options

| Option | Description | Default |
| :----- | :---------- | :------ |
| `-c`, `--config` \<path or preset config\> | Choose parser's configuration | `default` |
| `-h`, `--help` | Print available options | |
| `-i`, `--include` | Parse for inclusion | no inclusion |
| `-q`, `--quiet` | Report errors only | errors and warnings |
| `-s`, `--strict` | Exit when there is an error or warning<br>Override `-q` or `--quiet` | Exit `1` only where there is an error |
| `-v`, `--version` | Print package version | |
