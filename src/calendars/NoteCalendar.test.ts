import { TFile } from "obsidian";
import { ObsidianInterface } from "src/ObsidianAdapter";
import { MockApp, MockAppBuilder } from "../helpers/AppBuilder";
import { FileBuilder } from "../helpers/FileBuilder";
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
	it.each([
		[
			"One event",
			[
				{
					title: "2022-01-01 Test Event.md",
					event: {
						title: "Test Event",
						allDay: true,
						date: "2022-01-01",
					} as OFCEvent,
				},
			],
		],
		[
			"Two events",
			[
				{
					title: "2022-01-01 Test Event.md",
					event: {
						title: "Test Event",
						allDay: true,
						date: "2022-01-01",
					} as OFCEvent,
				},
				{
					title: "2022-01-02 Another Test Event.md",
					event: {
						title: "Another Test Event",
						allDay: true,
						date: "2022-01-02",
					} as OFCEvent,
				},
			],
		],
		[
			"Two events on the same day",
			[
				{
					title: "2022-01-01 Test Event.md",
					event: {
						title: "Test Event",
						allDay: true,
						date: "2022-01-01",
					} as OFCEvent,
				},
				{
					title: "2022-01-01 Another Test Event.md",
					event: {
						title: "Another Test Event",
						date: "2022-01-01",
						startTime: "11:00",
						endTime: "12:00",
					} as OFCEvent,
				},
			],
		],
	])("%p", async (_, inputs: { title: string; event: OFCEvent }[]) => {
		const obsidian = makeApp(
			MockAppBuilder.make()
				.folder(
					inputs.reduce(
						(builder, { title, event }) =>
							builder.file(
								title,
								new FileBuilder().frontmatter(event)
							),
						new MockAppBuilder(dirName)
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
		const res = await calendar.getEvents();
		expect(res.length).toBe(inputs.length);
		const events = res.map((e) => e[0]);
		const paths = res.map((e) => e[1].file.path);

		expect(
			res.every((elt) => elt[1].lineNumber === undefined)
		).toBeTruthy();

		for (const { event, title } of inputs) {
			expect(events).toContainEqual(event);
			expect(paths).toContainEqual(`${dirName}/${title}`);
		}

		for (const [event, { file }] of res) {
			const eventsFromFile = await calendar.getEventsInFile(file);
			expect(eventsFromFile.length).toBe(1);
			expect(eventsFromFile[0][0]).toEqual(event);
		}
	});
});
