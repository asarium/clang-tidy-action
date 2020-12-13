import * as core from "@actions/core";
import * as output from "./output";
import {relative} from "path";
import {promises as fs, constants as fsConst} from "fs";
import {parseReplacementsFile} from "./diagnostics";

async function run(): Promise<void> {
	try {
		core.debug("Start");

		const fixesFile = core.getInput("fixesFile", {
			required: true
		});
		const noFailure = core.getInput("noFailOnIssue") === "true";

		core.debug("Parsing replacements " + fixesFile);

		const diags = await parseReplacementsFile(fixesFile);

		for (const diag of diags) {
			output.fileError(
				`clang-tidy: ${diag.message} (${diag.name})`,
				relative(process.cwd(), diag.filePath),
				diag.location.line,
				diag.location.column,
			);
		}

		if (!noFailure && diags.length > 0) {
			core.setFailed(`Found ${diags.length} clang-tidy issues`);
		} else if (noFailure) {
			core.debug("Not failing due to option.");
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run().catch(e => core.error(e));
