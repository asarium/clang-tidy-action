import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as output from "./output";
import * as os from "os";
import {file, tmpName} from "tmp-promise";
import {promises as fs} from "fs";
import {relative, resolve} from "path";
import {produceDiff} from "./diff";
import {parseReplacementsFile} from "./diagnostics";
import {writeClangVfsConfiguration} from "./vfs";

const VFS_CONFIG_FILE = "/vfs.yaml";

function determineVolumeArgs(diffFilePath: string, vfsConfig: string, additionalDirs: string[]): string[] {
	const args: string[] = [];

	args.push("-v", `${process.cwd()}:${process.cwd()}`);
	args.push("-v", `${diffFilePath}:/changes.diff`);
	args.push("-v", `${vfsConfig}:${VFS_CONFIG_FILE}`);

	for (const dir of additionalDirs) {
		args.push("-v", `${dir}:${dir}`);
	}

	return args;
}

async function run(): Promise<void> {
	try {
		const llvmVersion = core.getInput("llvmVersion");
		const buildDir = core.getInput("buildDir", {required: true});
		const checkRegex = core.getInput("checkRegex");
		const includeDirs = core.getInput("includeDirs");
		const noFailure = core.getInput("noFailOnIssue") === "true";

		core.debug(noFailure.toString());

		const diff = await produceDiff();

		if (diff === null) {
			core.debug("Exiting because no diff is available");
			return;
		}

		core.startGroup("Run clang-tidy");

		await exec.exec("docker", ["pull", `asarium/clang-tidy-action:${llvmVersion}`]);

		const containerIdFile = await tmpName();
		const dockerArgs = Array.of("--cidfile", containerIdFile, "-w", process.cwd());

		const absoluteBuildDir = resolve(buildDir);
		const clangInvocation = Array.of(
			`asarium/clang-tidy-action:${llvmVersion}`,
			// Piping the changes directly via stdin does not work with docker so we need to do a slight hack here
			"/pipe_changes.sh",
			"/clang-tidy-diff.py",
			"-clang-tidy-binary",
			`/usr/bin/clang-tidy-${llvmVersion}`,
			"-path",
			absoluteBuildDir,
			"-p1",
			"-regex",
			checkRegex,
			`-j${os.cpus().length}`,
			"-export-fixes",
			"/fixes.yaml",
			"-vfsoverlay",
			VFS_CONFIG_FILE,
		);

		const diffFile = await file();
		await fs.writeFile(diffFile.path, diff);

		const vfsConfig = await writeClangVfsConfiguration();

		const args = Array.of("run").concat(
			determineVolumeArgs(diffFile.path, vfsConfig, includeDirs.split(":")),
			dockerArgs,
			clangInvocation,
		);

		const clangRetCode = await exec.exec("docker", args, {
			cwd: absoluteBuildDir,
			ignoreReturnCode: true,
			failOnStdErr: false,
		});

		core.debug(`Clang exited with code ${clangRetCode}`);

		const containerId = await fs.readFile(containerIdFile, {encoding: "utf-8"});

		const fixesFile = await tmpName({postfix: ".yaml"});
		const retCode = await exec.exec("docker", ["cp", `${containerId}:/fixes.yaml`, fixesFile], {
			ignoreReturnCode: true,
		});

		core.endGroup();

		if (retCode !== 0) {
			// The file does not exist so there was nothing to fix!
			core.info("No issues detected.");
			return;
		}

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
