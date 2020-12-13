import {promises as fs} from "fs";
import yaml from "js-yaml";
import lineColumn from "line-column";

type FileReader = (path: string) => Promise<string>;

export interface ParseOptions {
	fileReader: FileReader;
}

async function defaultReader(path: string): Promise<string> {
	return await fs.readFile(path, {encoding: "utf-8"});
}

const defaultOptions: ParseOptions = {
	fileReader: defaultReader,
};

async function determineFileLocation(path: string, offset: number, parseOptions: ParseOptions): Promise<Location> {
	const content = await parseOptions.fileReader(path);

	const finder = lineColumn(content);
	const info = finder.fromIndex(offset);

	if (info === null) {
		throw Error("Offset out of range!");
	}

	return {
		offset,
		line: info?.line,
		column: info?.col,
	};
}

interface Location {
	offset: number;
	line: number;
	column: number;
}

export interface Diagnostic {
	name: string;
	message: string;
	filePath: string;
	location: Location;
}

interface ClangDiagnosticMessage {
	FileOffset: number;
	FilePath: string;
	Message: string;
}

interface ClangDiagnostic {
	DiagnosticName: string;
	DiagnosticMessage: ClangDiagnosticMessage;
}

interface ClangReplacementFile {
	MainSourceFile?: string;
	Diagnostics?: ClangDiagnostic[];
}

export async function parseReplacementsFile(path: string, options: Partial<ParseOptions> = {}): Promise<Diagnostic[]> {
	const fullOptions = {
		...defaultOptions,
		...options,
	};

	const data = await fullOptions.fileReader(path);

	const doc = yaml.safeLoad(data) as ClangReplacementFile;

	if (!doc.Diagnostics) {
		return [];
	}

	return Promise.all(
		doc.Diagnostics.map<Promise<Diagnostic>>(async diag => ({
			name: diag.DiagnosticName,
			message: diag.DiagnosticMessage.Message,
			filePath: diag.DiagnosticMessage.FilePath,
			location: await determineFileLocation(
				diag.DiagnosticMessage.FilePath,
				diag.DiagnosticMessage.FileOffset,
				fullOptions,
			),
		})),
	);
}