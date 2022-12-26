import { assert } from "chai";
import { ObsidianInterface } from "src/ObsidianAdapter";

// TODO: Make a file "builder" where you build up a file with a series of funcitons
// like makeHeading(), makeListItem(), etc. The result of this is both a metadata cache entry
// AND an actual file contents. That way it doesn't have to get duplicated.

const mockObsidian = (): ObsidianInterface => ({
	getAbstractFileByPath: jest.fn(),
	getFileByPath: jest.fn(),
	getMetadata: jest.fn(),
	read: jest.fn(),
	create: jest.fn(),
	rewrite: jest.fn(),
	rename: jest.fn(),
	delete: jest.fn(),
});

describe("Note Calendar Tests", () => {
	it("fake test", () => {
		assert(true);
	});
});
