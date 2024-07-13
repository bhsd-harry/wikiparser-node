/* eslint jsdoc/require-jsdoc: 0 */
import type {CodeJarAsync, codejar as f} from './typings';

const codejar = (async (): Promise<f> => {
	const {CodeJar}: {CodeJar: typeof CodeJarAsync} = await import('https://testingcf.jsdelivr.net/npm/codejar-async');

	return (textbox: HTMLTextAreaElement, include?: boolean): CodeJarAsync & {include: boolean} => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
		}
		const preview = document.createElement('div'),
			container = document.createElement('div'),
			{offsetHeight, style: {height}, selectionStart: start, selectionEnd: end} = textbox;
		preview.id = 'wikiPretty';
		preview.classList.add('wikiparser', 'wpb-root');
		container.className = 'wikiparse-container';
		container.style.height = offsetHeight ? `${offsetHeight}px` : height;
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		textbox.style.visibility = 'hidden';
		container.append(preview, textbox);

		const id = wikiparse.id++;
		/** @implements */
		const highlight = async (e: HTMLElement): Promise<string> =>
			(await wikiparse.print(e.textContent!, jar.include, undefined, id)).map(([,, printed]) => printed).join('');
		const jar = {
			...CodeJar(preview, highlight, {spellcheck: true}), // eslint-disable-line new-cap
			include: Boolean(include),
		};
		jar.restore({start: 0, end: 0});
		jar.updateCode(textbox.value);
		jar.restore({start, end});
		textbox.form?.addEventListener('submit', () => {
			textbox.value = jar.toString();
		});
		return jar;
	};
})();

wikiparse.codejar = codejar;
(async () => {
	wikiparse.codejar = await codejar;
})();
