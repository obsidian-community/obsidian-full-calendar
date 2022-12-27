import { TFile } from "obsidian";
import { ObsidianInterface } from "src/ObsidianAdapter";
import { MockApp, MockAppBuilder } from "src/helpers/AppBuilder";
import { FileBuilder } from "src/helpers/FileBuilder";
import { OFCEvent } from "src/types";
import NoteCalendar from "./NoteCalendar";

const makeApp = (app: MockApp): ObsidianInterface => ({
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

const dirName = "events";
const color = "#BADA55";

describe("Note Calendar Tests", () => {
	it("parses one event", async () => {
		const eventInput: OFCEvent = {
			title: "Test Event",
			allDay: true,
			date: "2022-01-01",
		};
		const title = "2022-01-01 Test Event.md";
		const obsidian = makeApp(
			MockAppBuilder.make()
				.folder(
					new MockAppBuilder(dirName).file(
						title,
						new FileBuilder().frontmatter(eventInput)
					)
				)
				.done()
		);
		const calendar = new NoteCalendar(
			obsidian,
			color,
			dirName,
			false,
			true
		);
		const events = await calendar.getEvents();
		expect(events.length).toBe(1);
		const [event, { file, lineNumber }] = events[0];
		expect(event).toEqual(eventInput);
		expect(file.path).toEqual(`${dirName}/${title}`);
		expect(lineNumber).toBeUndefined();
	});
});
