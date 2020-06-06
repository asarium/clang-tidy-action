import {parseReplacementsFile} from "../src/diagnostics";
import {promises as fs} from "fs";

test("single message is parsed", async () => {
	const diags = await parseReplacementsFile("/singleMessage.yaml", {
		fileReader: async path => fs.readFile(`${__dirname}/diagnostics${path}`, {encoding: "utf-8"}),
	});

	expect(diags.length).toBe(1);
	expect(diags[0].name).toBe("modernize-use-using");
	expect(diags[0].filePath).toBe("/singleMessage.cpp");
	expect(diags[0].location.offset).toBe(39);
	expect(diags[0].location.line).toBe(3);
	expect(diags[0].location.column).toBe(1);
});
