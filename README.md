[![npm version](https://badge.fury.io/js/wikilint.svg)](https://www.npmjs.com/package/wikilint)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![codebeat badge](https://codebeat.co/badges/7cdd51e6-2c5d-4a22-aae1-f5e352047d54)](https://codebeat.co/projects/github-com-bhsd-harry-wikiparser-node-main)
![Istanbul coverage](./coverage/badge.svg)

# WikiLint

This is a minimal version of [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node) customized for [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext).

You can also directly lint Wikitext articles in the command line using this package:

```sh
npx wikilint --config zhwiki --include --lang zh-hans *.wiki
```

## CLI Options

| Option | Description | Default |
| :----- | :---------- | :------ |
| `-c`, `--config` \<path or preset config\> | Choose parser's configuration | `default` |
| `-h`, `--help` | Print available options | |
| `-i`, `--include` | Parse for inclusion | no inclusion |
| `-l`, `--lang` | Choose i18n language | English |
| `-q`, `--quiet` | Report errors only | errors and warnings |
| `-s`, `--strict` | Exit when there is an error or warning<br>Override `-q` or `--quiet` | Exit `1` only where there is an error |
| `-v`, `--version` | Print package version | |
