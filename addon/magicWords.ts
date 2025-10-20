const magicWords = [
	'currentmonth',
	'currentmonth1',
	'currentmonthname',
	'currentmonthnamegen',
	'currentmonthabbrev',
	'currentday',
	'currentday2',
	'currentdayname',
	'currentyear',
	'currenttime',
	'currenthour',
	'currentweek',
	'currentdow',
	'currenttimestamp',
	'localmonth',
	'localmonth1',
	'localmonthname',
	'localmonthnamegen',
	'localmonthabbrev',
	'localday',
	'localday2',
	'localdayname',
	'localyear',
	'localtime',
	'localhour',
	'localweek',
	'localdow',
	'localtimestamp',
] as const;
export type MagicWord = typeof magicWords[number];
export const expandedMagicWords = new Set<string>(magicWords);

/**
 * 展开魔术字
 * @param name 魔术字名称
 * @param now 当前时间
 * @throws `RangeError` 不支持的魔术字名称
 */
export const expandMagicWord = (name: MagicWord, now: Date): string | number => {
	switch (name) {
		case 'currentyear':
			return now.getUTCFullYear();
		case 'currentmonth':
			return String(now.getUTCMonth() + 1).padStart(2, '0');
		case 'currentmonth1':
			return now.getUTCMonth() + 1;
		case 'currentmonthname':
		case 'currentmonthnamegen':
			return now.toLocaleString('default', {month: 'long', timeZone: 'UTC'});
		case 'currentmonthabbrev':
			return now.toLocaleString('default', {month: 'short', timeZone: 'UTC'});
		case 'currentday':
			return now.getUTCDate();
		case 'currentday2':
			return String(now.getUTCDate()).padStart(2, '0');
		case 'currentdow':
			return now.getUTCDay();
		case 'currentdayname':
			return now.toLocaleString('default', {weekday: 'long', timeZone: 'UTC'});
		case 'currenttime':
			return `${String(now.getUTCHours()).padStart(2, '0')}:${
				String(now.getUTCMinutes()).padStart(2, '0')
			}`;
		case 'currenthour':
			return String(now.getUTCHours()).padStart(2, '0');
		case 'currentweek': {
			const firstDay = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
			return Math.ceil((now.getTime() - firstDay.getTime()) / 1e3 / 60 / 60 / 24 / 7);
		}
		case 'currenttimestamp':
			return now.toISOString().slice(0, 19).replace(/[-:T]/gu, '');
		case 'localyear':
			return now.getFullYear();
		case 'localmonth':
			return String(now.getMonth() + 1).padStart(2, '0');
		case 'localmonth1':
			return now.getMonth() + 1;
		case 'localmonthname':
		case 'localmonthnamegen':
			return now.toLocaleString('default', {month: 'long'});
		case 'localmonthabbrev':
			return now.toLocaleString('default', {month: 'short'});
		case 'localday':
			return now.getDate();
		case 'localday2':
			return String(now.getDate()).padStart(2, '0');
		case 'localdow':
			return now.getDay();
		case 'localdayname':
			return now.toLocaleString('default', {weekday: 'long'});
		case 'localtime':
			return `${String(now.getHours()).padStart(2, '0')}:${
				String(now.getMinutes()).padStart(2, '0')
			}`;
		case 'localhour':
			return String(now.getHours()).padStart(2, '0');
		case 'localweek': {
			const firstDay = new Date(now.getFullYear(), 0, 1);
			return Math.ceil((now.getTime() - firstDay.getTime()) / 1e3 / 60 / 60 / 24 / 7);
		}
		case 'localtimestamp':
			return String(now.getFullYear())
				+ String(now.getMonth() + 1).padStart(2, '0')
				+ String(now.getDate()).padStart(2, '0')
				+ String(now.getHours()).padStart(2, '0')
				+ String(now.getMinutes()).padStart(2, '0')
				+ String(now.getSeconds()).padStart(2, '0');
		default:
			throw new RangeError(`Unsupported magic word: ${name as string}`);
	}
};
