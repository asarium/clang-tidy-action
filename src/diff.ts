import * as github from "@actions/github";
import * as core from "@actions/core";
import {execWithStdout} from "./util";

const getPRNumber = (): number | undefined => {
	const pr = github.context.payload.pull_request;

	if (pr) {
		return pr.number;
	}

	core.error("This action can only be run for pull requests!");
};

interface CommitRange {
	begin: string;
	end: string;
}

async function determineCommitRange(): Promise<CommitRange | null> {
	const prNumber = getPRNumber();

	if (!prNumber) {
		return null;
	}

	const repoToken = core.getInput("repoToken", {required: true});
	const oktokit = new github.GitHub(repoToken);

	core.debug(`Getting information for PR ${prNumber}.`);
	const pr = await oktokit.pulls.get({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		// eslint-disable-next-line @typescript-eslint/camelcase
		pull_number: prNumber,
	});

	return {begin: pr.data.base.sha, end: pr.data.head.sha};
}

export async function produceDiff(): Promise<Buffer | null> {
	const commitRange = await determineCommitRange();

	if (!commitRange) {
		return null;
	}

	const mergeBaseOutput = await execWithStdout(
		"git",
		["merge-base", `${commitRange.end}`, `${commitRange.begin}`],
		false,
	);

	if (mergeBaseOutput == null) {
		throw new Error("Failed to determine merge base");
	}

	const mergeBase = mergeBaseOutput.toString("utf-8").trim();

	return await execWithStdout("git", ["diff", "-U0", "--no-color", `${mergeBase}..HEAD`]);
}
