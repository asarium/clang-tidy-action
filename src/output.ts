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

function output(type: string, message: string, file: string, line: number, column: number): void {
	const text = `::${type} file=${escape(file)},line=${line},col=${column}::${escapeData(message)}`;
	// eslint-disable-next-line no-console
	console.log(text);
}

export function fileError(message: string, file: string, line: number, column: number): void {
	output("error", message, file, line, column);
}

export function fileWarning(message: string, file: string, line: number, column: number): void {
	output("warning", message, file, line, column);
}
