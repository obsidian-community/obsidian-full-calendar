import {
	MarkdownView,
	MetadataCache,
	TFile,
	Vault,
	WorkspaceLeaf,
} from "obsidian";
import { getDateFromPath } from "obsidian-daily-notes-interface";
import {
	getInlineEventFromLine,
	modifyListItem,
	withFile,
} from "src/serialization/inline";
import { FCError, OFCEvent } from "src/types";
import { DATE_FORMAT } from "./DailyNoteSource";
import { CalendarEvent, LocalEvent } from "./Event";

export class DailyNoteEvent extends LocalEvent {
	static ID_PREFIX = "dailynote";
	lineNumber: number;

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: OFCEvent,
		{
			directory,
			filename,
			lineNumber,
		}: { directory: string; filename: string; lineNumber: number }
	) {
		super(cache, vault, data, directory, filename);
		this.lineNumber = lineNumber;
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
		lineNumber: number
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
		});
	}

	static async fromPath(
		cache: MetadataCache,
		vault: Vault,
		path: string,
		lineNumber: number
	) {
		const file = vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new FCError(`File not found at path: ${path}`);
		}
		return this.fromFile(cache, vault, file, lineNumber);
	}

	get path(): string {
		return `${this.directory}/${this.filename}`;
	}

	async setData(data: OFCEvent): Promise<void> {
		const oldData = this.data;
		if (data.type === "recurring" || oldData.type === "recurring") {
			throw new Error(
				"Recurring events in daily notes are not supported."
			);
		}
		if (data.endDate || oldData.endDate) {
			throw new Error(
				"Multi-day events in daily notes are not supported."
			);
		}
		if (data.date !== oldData.date) {
			// TODO: Move events between daily notes.
			throw new Error("Cannot move events between daily notes.");
		}
		await withFile(this.vault, this.file, modifyListItem)(
			this.lineNumber,
			data,
			["date", "type"]
		);
	}
	async delete(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	get identifier(): string {
		return `${this.filename}${CalendarEvent.ID_SEPARATOR}${JSON.stringify(
			this.lineNumber
		)}`;
	}
	get PREFIX(): string {
		return DailyNoteEvent.ID_PREFIX;
	}
}
