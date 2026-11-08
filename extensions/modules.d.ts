declare module '/wikiparser-node/extensions/*' {
	export const prepareDoneBtn: PrepareDoneBtn;
	export const hideOptGroup: HideOptGroup;
	export const addOption: AddOption;
	export const changeHandler: ChangeHandler;
	export const hashChangeHandler: HashChangeHandler;
	export const inputHandler: InputHandler;
}

declare module '/wikiparser-node/bundle/*' {
	const Parser: {
		config?: import('./typings').ConfigData;
		toHtml(wikitext: string): string;
	};
	export default Parser;
}
