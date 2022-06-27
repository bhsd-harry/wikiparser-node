declare global {
	interface TableCoords {
		row: number;
		column: number;
		start: boolean;
	}

	interface TableRenderedCoords {
		x: number;
		y: number;
	}
}

export {};
