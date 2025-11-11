import fs from 'fs';
import path from 'path';
import Parser from '../index';

Parser.config = 'mediawikiwiki';
Parser.templateDir = './example/';
Parser.getConfig();
Object.assign(Parser.config, {articlePath: '/wikiparser-node/example/$1'});

for (const file of fs.readdirSync(Parser.templateDir)) {
	if (!file.endsWith('.wiki') || /^(?:Template|MediaWiki):/u.test(file)) {
		continue;
	}
	const p = path.join('example', file),
		page = file.slice(0, -5),
		title = page.replaceAll('_', ' '),
		/* eslint-disable @stylistic/max-len */
		wiki = `<div style="font-size:small;margin-bottom:.5em">This article incorporates material derived from the [https://www.mediawiki.org/wiki/${
			page
		} ${title}] article at [https://www.mediawiki.org/ MediaWiki.org] ${
			title.startsWith('Help:')
				? 'as Public Domain ([https://creativecommons.org/publicdomain/zero/1.0/ CC0])'
				: 'under the [https://creativecommons.org/licenses/by-sa/4.0/" Creative Commons Attribution/Share-Alike License] (CC BY-SA)'
		}.</div>
${fs.readFileSync(p, 'utf8')}`,
		root = Parser.parse(wiki);
	root.pageName = page;
	const html = `<!DOCTYPE html>
<html dir="ltr" lang="en-US">
<head>
	<title>${title}</title>
	<meta charset="utf-8">
	<meta name="viewport" content="initial-scale=1.0, user-scalable=yes, minimum-scale=0.25, maximum-scale=5.0, width=device-width">
	<link rel="icon" href="data:image/png;base64,iVBORw0KGgo=">
	<link rel="stylesheet" href="../extensions/test-page.css">
	<link rel="stylesheet" href="../extensions/example.css">
</head>
<body>
	<main>
		<article>
			<div class="frame">${root.toHtml()}</div>
		</article>
	</main>
</body>
</html>`;
	/* eslint-enable @stylistic/max-len */
	fs.writeFileSync(`${p.slice(0, -5)}.html`, html);
}
