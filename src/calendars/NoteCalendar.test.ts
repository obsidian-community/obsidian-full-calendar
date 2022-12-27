import { TFile } from "obsidian";
import { ObsidianInterface } from "src/ObsidianAdapter";
import { MockApp } from "src/test_helpers/AppBuilder";

const mockObsidian = (app: MockApp): ObsidianInterface => ({
	getAbstractFileByPath: (path) => app.vault.getAbstractFileByPath(path),
	getFileByPath(path: string): TFile | null {
		const f = app.vault.getAbstractFileByPath(path);
		if (!f) {
			return null;
		}
		if (!(f instanceof TFile)) {
			return null;
		}
		return f;
	},
	getMetadata: (file) => app.metadataCache.getFileCache(file),
	read: (file) => app.vault.read(file),
	create: jest.fn(),
	rewrite: jest.fn(),
	rename: jest.fn(),
	delete: jest.fn(),
});

describe("Note Calendar Tests", () => {
	it("fake test", () => {
		expect(true).toBe(true);
	});
});
