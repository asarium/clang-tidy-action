function escapeData(s: string): string {
	return s.replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escape(s: string): string {
	return s
		.replace(/\r/g, "%0D")
		.replace(/\n/g, "%0A")
		.replace(/]/g, "%5D")
		.replace(/;/g, "%3B");
}

export function fileError(message: string, file: string, line: number, column: number): void {
	const output = `::error file=${escape(file)},line=${line},col=${column}::${escapeData(message)}`;
	// eslint-disable-next-line no-console
	console.log(output);
}
