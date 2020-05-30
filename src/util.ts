import {ExecOptions} from "@actions/exec/lib/interfaces";
import * as exec from "@actions/exec";

export async function execWithStdout(
	commandLine: string,
	args?: string[],
	silent: boolean = true,
): Promise<Buffer | null> {
	let output: Buffer | undefined;

	const options: ExecOptions = {
		silent,
		listeners: {
			stdout: (data: Buffer) => {
				if (!output) {
					output = data;
				} else {
					output = Buffer.concat([output, data]);
				}
			},
		},
	};

	await exec.exec(commandLine, args, options);

	if (!output) {
		return null;
	}

	return output;
}
