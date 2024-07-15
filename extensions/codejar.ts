/* eslint jsdoc/require-jsdoc: 0 */
import type {CodeJarAsync, codejar as f} from './typings';

const codejar = (async (): Promise<f> => {
	const {CodeJar}: {CodeJar: typeof CodeJarAsync} = 'CodeJar' in window
		? window
		: await import('https://testingcf.jsdelivr.net/npm/codejar-async');

	return (
		textbox: HTMLTextAreaElement,
		include?: boolean,
		linenums?: boolean,
	): CodeJarAsync & {include: boolean} => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
		}
		const preview = document.createElement('div'),
			root = document.createElement('span'),
			{offsetHeight, style: {height}, selectionStart: start, selectionEnd: end} = textbox;
		preview.className = 'wikiparser wikiparse-container';
		preview.style.height = offsetHeight ? `${offsetHeight}px` : height;
		root.className = 'wpb-root';
		preview.append(root);
		textbox.after(preview);
		textbox.style.display = 'none';

		const id = wikiparse.id++;
		/** @implements */
		const highlight = async (e: HTMLElement): Promise<string> =>
			(await wikiparse.print(e.textContent!, jar.include, undefined, id)).map(([,, printed]) => printed).join('');
		const jar = {
			...CodeJar(root, highlight, {spellcheck: true}), // eslint-disable-line new-cap
			include: Boolean(include),
		};
		if (linenums) {
			jar.onHighlight(e => {
				e.parentNode!.querySelector('.wikiparser-line-numbers')?.remove();
				wikiparse.lineNumbers(e);
			});
		}
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
