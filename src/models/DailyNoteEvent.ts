import moment from "moment";
import {
	MarkdownView,
	MetadataCache,
	TFile,
	Vault,
	WorkspaceLeaf,
} from "obsidian";
import {
	createDailyNote,
	getAllDailyNotes,
	getDailyNote,
	getDateFromPath,
} from "obsidian-daily-notes-interface";
import {
	addToHeading,
	getAllInlineEventsFromFile,
	getInlineEventFromLine,
	getListsUnderHeading,
	modifyListItem,
	withFile,
} from "src/serialization/inline";
import { FCError, OFCEvent } from "src/types";
import { DATE_FORMAT } from "./DailyNoteSource";
import { CalendarEvent, LocalEvent } from "./Event";

export class DailyNoteEvent extends LocalEvent {
	static ID_PREFIX = "dailynote";
	lineNumber: number;
	heading: string;

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: OFCEvent,
		{
			directory,
			filename,
			heading,
			lineNumber,
		}: {
			directory: string;
			heading: string;
			filename: string;
			lineNumber: number;
		}
	) {
		super(cache, vault, data, directory, filename);
		this.lineNumber = lineNumber;
		this.heading = heading;
	}

	async openIn(leaf: WorkspaceLeaf): Promise<void> {
		await leaf.openFile(this.file);
		if (leaf.view instanceof MarkdownView) {
			leaf.view.editor.setCursor({
				line: this.lineNumber,
				ch: 0,
			});
		}
	}

	static async fromFile(
		cache: MetadataCache,
		vault: Vault,
		file: TFile,
		lineNumber: number,
		heading: string
	): Promise<DailyNoteEvent | null> {
		const contents = await vault.read(file);
		const lines = contents.split("\n");
		const line = lines[lineNumber];

		const date = getDateFromPath(file.path, "day")?.format(DATE_FORMAT);
		if (!date) {
			return null;
		}
		const event = getInlineEventFromLine(line, { date });
		if (!event) {
			return null;
		}
		return new DailyNoteEvent(cache, vault, event, {
			directory: file.parent.path,
			filename: file.name,
			lineNumber,
			heading,
		});
	}

	static async fromPath(
		cache: MetadataCache,
		vault: Vault,
		path: string,
		lineNumber: number,
		heading: string
	) {
		const file = vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new FCError(`File not found at path: ${path}`);
		}
		return this.fromFile(cache, vault, file, lineNumber, heading);
	}

	get path(): string {
		return `${this.directory}/${this.filename}`;
	}

	static async create(
		cache: MetadataCache,
		vault: Vault,
		heading: string,
		data: OFCEvent
	): Promise<void | null> {
		if (data.type === "recurring") {
			return null;
		}
		const m = moment(data.date);
		// @ts-ignore
		let file = getDailyNote(m, getAllDailyNotes());
		if (!file) {
			// @ts-ignore
			file = await createDailyNote(m);
		}
		// HACK: Make sure the cache is populated before getting the heading info.
		await vault.cachedRead(file);

		const headingCache = cache
			.getFileCache(file)
			?.headings?.find((h) => h.heading == heading);

		let contents = await vault.read(file);
		contents = addToHeading(contents, {
			heading: headingCache,
			item: data,
			headingText: heading,
		});
		await vault.modify(file, contents);
	}

	async setData(newData: OFCEvent): Promise<void> {
		const oldData = this.data;
		if (newData.type === "recurring" || oldData.type === "recurring") {
			throw new Error(
				"Recurring events in daily notes are not supported."
			);
		}
		if (newData.endDate || oldData.endDate) {
			throw new Error(
				"Multi-day events in daily notes are not supported."
			);
		}
		this._data = newData;
		if (newData.date !== oldData.date) {
			const m = moment(newData.date);
			// @ts-ignore
			let note = getDailyNote(m, getAllDailyNotes());
			if (!note) {
				// @ts-ignore
				note = await createDailyNote(m);
			}
			await this.removeFromFile();
			await this.addToFile(note);
		} else {
			await withFile(
				this.vault,
				this.file,
				modifyListItem
			)({ lineNumber: this.lineNumber, data: newData });
		}
	}

	async removeFromFile(): Promise<void> {
		const file = this.file;
		let lines = (await this.vault.read(file)).split("\n");
		lines.splice(this.lineNumber, 1);
		await this.vault.modify(file, lines.join("\n"));
		this.lineNumber = -1;
	}

	async addToFile(file: TFile): Promise<void> {
		const heading = this.cache
			.getFileCache(file)
			?.headings?.find((h) => h.heading == this.heading);
		if (this.data.type !== "single") {
			throw new FCError(
				"Daily note calendar does not support recurring events."
			);
		}

		await withFile(
			this.vault,
			file,
			addToHeading
		)({ heading, item: this.data, headingText: this.heading });
		this.directory = file.parent.path;
		this.filename = file.name;
		// TODO: Set the LineNumber.
	}

	async delete(): Promise<void> {
		this.removeFromFile();
	}
	get identifier(): string {
		return `${this.path}${CalendarEvent.ID_SEPARATOR}${this.lineNumber}`;
	}
	get PREFIX(): string {
		return DailyNoteEvent.ID_PREFIX;
	}
}
