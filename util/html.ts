/**
 * get common prefix length
 * @param prefix
 * @param lastPrefix
 */
export const getCommon = (prefix: string, lastPrefix: string): number =>
	// eslint-disable-next-line @typescript-eslint/no-misused-spread
	prefix.startsWith(lastPrefix) ? lastPrefix.length : [...lastPrefix].findIndex((ch, i) => ch !== prefix[i]);
