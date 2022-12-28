import { TFile, TFolder } from "obsidian";
import { EventPathLocation } from "../core/EventStore";
import { ObsidianInterface } from "../ObsidianAdapter";
import {
	modifyFrontmatterString,
	newFrontmatter,
} from "../serialization/frontmatter";
import {
	OFCEvent,
	EventLocation,
	LocalCalendarSource,
	validateEvent,
} from "../types";
import { EditableCalendar, EditableEventResponse } from "./EditableCalendar";

const basenameFromEvent = (event: OFCEvent): string => {
	switch (event.type) {
		case undefined:
		case "single":
			return `${event.date} ${event.title}`;
		case "recurring":
			return `(Every ${event.daysOfWeek.join(",")}) ${event.title}`;
	}
};

const filenameForEvent = (event: OFCEvent) => `${basenameFromEvent(event)}.md`;

export default class NoteCalendar extends EditableCalendar {
	app: ObsidianInterface;
	private _directory: string;
	private isRecursive: boolean;
	private systemTrash: boolean;

	constructor(
		app: ObsidianInterface,
		color: string,
		directory: string,
		isRecursive: boolean,
		systemTrash: boolean
	) {
		super(color);
		this.app = app;
		this._directory = directory;
		this.isRecursive = isRecursive;
		this.systemTrash = systemTrash;
	}
	get directory(): string {
		return this._directory;
	}

	get type(): string {
		return "NOTE";
	}
	get id(): string {
		return this.directory;
	}

	async getEventsInFile(file: TFile): Promise<EditableEventResponse[]> {
		let event = validateEvent(this.app.getMetadata(file)?.frontmatter);
		if (!event) {
			return [];
		}
		if (!event.title) {
			event.title = file.basename;
		}
		return [[event, { file, lineNumber: undefined }]];
	}

	private async getEventsInFolderRecursive(
		folder: TFolder
	): Promise<EditableEventResponse[]> {
		const events = await Promise.all(
			folder.children.map(async (file) => {
				if (file instanceof TFile) {
					return await this.getEventsInFile(file);
				} else if (file instanceof TFolder) {
					return await this.getEventsInFolderRecursive(file);
				} else {
					return [];
				}
			})
		);
		return events.flat();
	}

	async getEvents(): Promise<EditableEventResponse[]> {
		const eventFolder = this.app.getAbstractFileByPath(this.directory);
		if (!eventFolder) {
			throw new Error(`Cannot get folder ${this.directory}`);
		}
		if (!(eventFolder instanceof TFolder)) {
			throw new Error(`${eventFolder} is not a directory.`);
		}
		const events: EditableEventResponse[] = [];
		for (const file of eventFolder.children) {
			if (file instanceof TFile) {
				const results = await this.getEventsInFile(file);
				events.push(...results);
			} else if (file instanceof TFolder && this.isRecursive) {
				const results = await this.getEventsInFolderRecursive(file);
				events.push(...results);
			}
		}
		return events;
	}

	async createEvent(event: OFCEvent): Promise<EventLocation> {
		const path = `${this.directory}/${filenameForEvent(event)}`;
		if (this.app.getAbstractFileByPath(path)) {
			throw new Error(`Event at ${path} already exists.`);
		}
		const file = await this.app.create(path, newFrontmatter(event));
		return { file, lineNumber: undefined };
	}

	async updateEvent(
		location: EventPathLocation,
		event: OFCEvent
	): Promise<EventLocation> {
		const { path, lineNumber } = location;
		if (lineNumber !== undefined) {
			throw new Error("Note calendar cannot handle inline events.");
		}
		const file = this.app.getFileByPath(path);
		if (!file) {
			throw new Error(
				`File ${path} either doesn't exist or is a folder.`
			);
		}

		await this.app.rewrite(file, (page) =>
			modifyFrontmatterString(page, event)
		);
		const updatedPath = `${file.parent.path}/${filenameForEvent(event)}`;
		if (file.path !== updatedPath) {
			const newPath = updatedPath;
			await this.app.rename(file, newPath);
		}
		// TODO: Test to see if a file reference is still valid after a rename.
		const newFile = this.app.getAbstractFileByPath(updatedPath);
		if (!newFile || !(newFile instanceof TFile)) {
			throw new Error("File cannot be found after rename.");
		}
		return { file: newFile, lineNumber: undefined };
	}

	async moveEvent(
		location: EventPathLocation,
		destination: EditableCalendar
	): Promise<EventLocation> {
		const { path, lineNumber } = location;
		if (lineNumber !== undefined) {
			throw new Error("Note calendar cannot handle inline events.");
		}
		if (!(destination instanceof NoteCalendar)) {
			throw new Error(
				`Event cannot be moved to a note calendar from a calendar of type ${destination.type}.`
			);
		}
		const file = this.app.getFileByPath(path);
		if (!file) {
			throw new Error(`File ${path} not found.`);
		}
		const destDir = destination.directory;
		const newPath = `${destDir}/${file.name}`;
		await this.app.rename(file, newPath);
		// TODO: Test to see if a file reference is still valid after a rename.
		const newFile = this.app.getAbstractFileByPath(newPath);
		if (!newFile || !(newFile instanceof TFile)) {
			throw new Error("File cannot be found after rename.");
		}
		return { file: newFile, lineNumber: undefined };
	}

	deleteEvent({ path, lineNumber }: EventPathLocation): Promise<void> {
		if (lineNumber !== undefined) {
			throw new Error("Note calendar cannot handle inline events.");
		}
		const file = this.app.getFileByPath(path);
		if (!file) {
			throw new Error(`File ${path} not found.`);
		}
		return this.app.delete(file, this.systemTrash);
	}

	async upgradeNote(file: TFile, event: OFCEvent) {
		await this.app.rewrite(file, (page) =>
			modifyFrontmatterString(page, event)
		);
		const newPath = `${this.directory}/${file.name}`;
		await this.app.rename(file, newPath);
	}
}
