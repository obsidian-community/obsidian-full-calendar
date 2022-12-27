import { getInlineAttributes } from "./inline";

it.each([
	["one variable [hello:: world]", { hello: "world" }],
	["[first:: a] message [second:: b]", { first: "a", second: "b" }],
	[
		"this is a long string with [some brackets] but no actual:: inline fields",
		{},
	],
])("%p", (line: string, obj: any) => {
	expect(getInlineAttributes(line)).toEqual(obj);
});
