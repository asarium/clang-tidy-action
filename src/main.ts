import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as output from "./output";

async function run(): Promise<void> {
	try {
		await exec.exec("pip3", ["install", "yaml"]);

		output.fileError("Test!", "test_cpp/test2.cpp", 3, 18);
	} catch (error) {
		core.setFailed(error.message);
	}
}

run().catch(e => core.error(e));
