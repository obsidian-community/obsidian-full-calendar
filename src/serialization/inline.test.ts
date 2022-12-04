import { getInlineAttributes } from "./inline";
import { assert } from "chai";

it.each([
	["one variable [hello:: world]", { hello: "world" }],
	["[first:: a] message [second:: b]", { first: "a", second: "b" }],
	[
		"this is a long string with [some brackets] but no actual:: inline fields",
		{},
	],
])("%p", (line: string, obj: any) => {
	assert.deepEqual(getInlineAttributes(line), obj);
});
