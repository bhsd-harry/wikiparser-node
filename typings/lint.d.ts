interface LintError {
	message: string;
	severity: 'error'|'warning';
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
	excerpt: string;
}

export = LintError;
