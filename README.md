<div align="center"><img src="https://github.com/bhsd-harry/wikiparser-node/raw/main/logo.png" width="200" alt="WikiParser-Node logo"></div>

# WikiLint

[![npm version](https://badge.fury.io/js/wikilint.svg)](https://www.npmjs.com/package/wikilint)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/a2fbe7641031451baca2947ae6d7891f)](https://app.codacy.com/gh/bhsd-harry/wikiparser-node/dashboard)
![Istanbul coverage](./coverage/badge.svg)

This is a minimal version of [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node). The [Wikitext LSP](https://www.npmjs.com/package/wikitext-lsp) and the [WikiParser Language Server](https://marketplace.visualstudio.com/items?itemName=Bhsd.vscode-extension-wikiparser) VS Code extension is written based on this package.

You can also directly lint Wikitext articles in the command line using this package:

```sh
npx wikilint --config zhwiki --include --lang zh-hans *.wiki
```

## CLI Options

| Option | Argument | Description | Default |
| :----- | :------- | :---------- | :------ |
| `-c`, `--config` | \<path or preset config\> | Choose parser's [configuration](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#config) | `default` |
| `--cache` | | Enable caching | `false` |
| `--cache-file` | \<path\> | Specify cache file and enable caching | `.wikilintcache` |
| `--ext` | \<extension\> | Specify file extension<br>Can be used multiple times | all files |
| `--fix` | | Automatically fix problems | `false` |
| `-h`, `--help` | | Print available options | |
| `-i`, `--include` | | Parse for inclusion | `false` |
| `--ignore` | \<pattern\> | Ignore files matching the glob pattern<br>Can be used multiple times | |
| `-l`, `--lang` | \<path or preset language\> | Choose [i18n](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#i18n) language | English |
| `--lc`, `--lint-config` | \<path\> | Specify [lint config](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#configuration) file | `.wikilintrc.json`<br>`.wikilintrc.js`<br>`.wikilintrc.cjs`<br>`.wikilintrc.mjs` |
| `-q`, `--quiet` | | Report errors only | errors and warnings |
| `-r`, `--recursive` | | Recursively lint files | `false` |
| `-s`, `--strict` | | Exit when there is an error or warning<br>Override `-q` or `--quiet` | Exit `1` only where there is an error |
| `-v`, `--version` | | Print package version | |

## Configuration

For MediaWiki sites with the [CodeMirror extension](https://mediawiki.org/wiki/Extension:CodeMirror) installed, such as different language editions of Wikipedia and other [Wikimedia Foundation-hosted sites](https://meta.wikimedia.org/wiki/Special:SiteMatrix), you can use the following command to obtain the parser configuration:

```sh
npx getParserConfig <site> <script path> [user] [force]
# For example:
npx getParserConfig jawiki https://ja.wikipedia.org/w user@example.net
```

The generated configuration file will be saved in the `config` directory. You can then use the site name as the `--config` option.

```sh
# For example:
npx wikilint --config jawiki *.wiki
```
