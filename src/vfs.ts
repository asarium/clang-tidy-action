import yaml from "js-yaml";
import {promises as fs} from "fs";
import {file} from "tmp-promise";

interface VfsRoot {
	name: string;
	type: "file" | "directory";
	contents?: string;
	"external-contents"?: string;
	"use-external-name"?: string;
}

interface VfsConfiguration {
	version: 0;
	"case-sensitive"?: boolean;
	roots: VfsRoot[];
}

export async function writeClangVfsConfiguration(): Promise<string> {
	const config: VfsConfiguration = {
		version: 0,
		"case-sensitive": true,
		roots: [],
	};

	const yamlText = yaml.safeDump(config);

	const diffFile = await file();
	await fs.writeFile(diffFile.path, yamlText, {encoding: "utf-8"});

	return diffFile.path;
}
