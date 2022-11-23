import {
	MarkdownView,
	MetadataCache,
	Pos,
	TFile,
	Vault,
	WorkspaceLeaf,
} from "obsidian";
import { getDateFromPath } from "obsidian-daily-notes-interface";
import {
	extractTextFromPositions,
	getInlineEventFromLine,
	modifyListItem,
	withFile,
} from "src/serialization/inline";
import { FCError, OFCEvent } from "src/types";
import { DATE_FORMAT } from "./DailyNoteSource";
import { CalendarEvent, LocalEvent } from "./Event";

export class DailyNoteEvent extends LocalEvent {
	static ID_PREFIX = "dailynote";
	position: Pos;

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: OFCEvent,
		{
			directory,
			filename,
			position,
		}: { directory: string; filename: string; position: Pos }
	) {
		super(cache, vault, data, directory, filename);
		this.position = position;
	}

	async openIn(leaf: WorkspaceLeaf): Promise<void> {
		await leaf.openFile(this.file);
		if (leaf.view instanceof MarkdownView) {
			leaf.view.editor.setCursor({
				line: this.position.start.line,
				ch: this.position.start.col,
			});
		}
	}

	static async fromFile(
		cache: MetadataCache,
		vault: Vault,
		file: TFile,
		position: Pos
	): Promise<DailyNoteEvent | null> {
		const contents = await vault.read(file);
		const date = getDateFromPath(file.path, "day")?.format(DATE_FORMAT);
		if (!date) {
			return null;
		}
		const event = getInlineEventFromLine(
			extractTextFromPositions(contents, [position])[0].text,
			{ date }
		);
		if (!event) {
			return null;
		}
		return new DailyNoteEvent(cache, vault, event, {
			directory: file.parent.path,
			filename: file.name,
			position,
		});
	}

	static async fromPath(
		cache: MetadataCache,
		vault: Vault,
		path: string,
		position: Pos
	) {
		const file = vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new FCError(`File not found at path: ${path}`);
		}
		return this.fromFile(cache, vault, file, position);
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
			this.position,
			data,
			["date", "type"]
		);
	}
	async delete(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	get identifier(): string {
		return `${this.filename}${CalendarEvent.ID_SEPARATOR}${JSON.stringify(
			this.position
		)}`;
	}
	get PREFIX(): string {
		return DailyNoteEvent.ID_PREFIX;
	}
}
