function escapeData(s: string) {
	return s.replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escape(s: string) {
	return s
		.replace(/\r/g, "%0D")
		.replace(/\n/g, "%0A")
		.replace(/]/g, "%5D")
		.replace(/;/g, "%3B");
}

export function fileError(message: string, file: string, line: number, column: number): void {
	let output = `::error file=${escape(file)},line=${line},col=${column}::${escapeData(message)}`;
	console.log(output);
}
