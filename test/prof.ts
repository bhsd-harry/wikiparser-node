import {
	readFileSync,

	/* NOT FOR BROWSER ONLY */

	writeFileSync,
} from 'fs';
import single from './single';

/* NOT FOR BROWSER ONLY */

import inspector from 'inspector';
import lsp from './lsp';
import type {Profiler} from 'inspector';

declare interface ProfileNode extends Pick<Profiler.ProfileNode, 'callFrame' | 'hitCount'> {
	positionTicks: Record<number, number>;
}

/**
 * Adds the ticks to the myTicks object.
 * @param myTicks
 * @param positionTicks
 */
const addTicks = (myTicks: Record<number, number>, positionTicks?: Profiler.PositionTickInfo[]): void => {
	if (positionTicks) {
		for (const {line, ticks} of positionTicks) {
			myTicks[line] = (myTicks[line] ?? 0) + ticks;
		}
	}
};

/* NOT FOR BROWSER ONLY END */

const content = readFileSync('test/page.wiki', 'utf8'),
	{argv: [,, count, method = '']} = process;

/* NOT FOR BROWSER ONLY */

const session = new inspector.Session();
session.connect();
session.post('Profiler.enable', () => {
	session.post('Profiler.start', () => {
		/* NOT FOR BROWSER ONLY END */

		(async () => {
			for (let i = 0; i < (Number(count) || 10); i++) {
				const page: SimplePage = {content, ns: 0, pageid: 0, title: `Pass ${i}`};
				if (
					method !== 'lsp'
				) {
					await single(page, method);
				}

				/* NOT FOR BROWSER ONLY */

				if (!method || method === 'lsp') {
					await lsp(page);
				}

				/* NOT FOR BROWSER ONLY END */

				console.log();
			}

			/* NOT FOR BROWSER ONLY */

			session.post('Profiler.stop', (_, {profile: {nodes}}) => {
				const useful = nodes.filter(
						({callFrame: {url}, hitCount}) => url.startsWith('file:///') && hitCount,
					),
					summary: ProfileNode[] = [];
				for (const {callFrame, hitCount, positionTicks} of useful) {
					const existing = summary.find(
							({callFrame: {scriptId, lineNumber, columnNumber}}) => callFrame.scriptId === scriptId
								&& callFrame.lineNumber === lineNumber && callFrame.columnNumber === columnNumber,
						),
						myTicks: Record<number, number> = {};
					addTicks(myTicks, positionTicks);
					if (existing) {
						existing.hitCount! += hitCount!;
						addTicks(existing.positionTicks, positionTicks);
					} else {
						summary.push({callFrame, hitCount, positionTicks: myTicks});
					}
				}
				writeFileSync('test/prof.json', JSON.stringify(useful, null, '\t'));
				writeFileSync('test/prof-summary.json', JSON.stringify(summary, null, '\t'));
				session.disconnect();
			});
		})();
	});
});
