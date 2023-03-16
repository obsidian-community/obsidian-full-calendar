import { TFile, TFolder } from "obsidian";
import { rrulestr } from "rrule";
import { EventPathLocation } from "../core/EventStore";
import { ObsidianInterface } from "../ObsidianAdapter";
import {
    modifyFrontmatterString,
    newFrontmatter,
} from "../serialization/frontmatter";
import { OFCEvent, EventLocation, validateEvent } from "../types";
import { EditableCalendar, EditableEventResponse } from "./EditableCalendar";

const basenameFromEvent = (event: OFCEvent): string => {
    switch (event.type) {
        case undefined:
        case "single":
            return `${event.date} ${event.title}`;
        case "recurring":
            return `(Every ${event.daysOfWeek.join(",")}) ${event.title}`;
        case "rrule":
            return `(${rrulestr(event.rrule).toText()}) ${event.title}`;
    }
};

const filenameForEvent = (event: OFCEvent) => `${basenameFromEvent(event)}.md`;

export default class FullNoteCalendar extends EditableCalendar {
    app: ObsidianInterface;
    private _directory: string;

    constructor(app: ObsidianInterface, color: string, directory: string) {
        super(color);
        this.app = app;
        this._directory = directory;
    }
    get directory(): string {
        return this._directory;
    }

    get type(): "local" {
        return "local";
    }

    get identifier(): string {
        return this.directory;
    }

    get name(): string {
        return this.directory;
    }

    async getEventsInFile(file: TFile): Promise<EditableEventResponse[]> {
        const metadata = this.app.getMetadata(file);
        let event = validateEvent(metadata?.frontmatter);
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

    getNewLocation(
        location: EventPathLocation,
        event: OFCEvent
    ): EventLocation {
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

        const updatedPath = `${file.parent.path}/${filenameForEvent(event)}`;
        return { file: { path: updatedPath }, lineNumber: undefined };
    }

    async modifyEvent(
        location: EventPathLocation,
        event: OFCEvent,
        updateCacheWithLocation: (loc: EventLocation) => void
    ): Promise<void> {
        const { path } = location;
        const file = this.app.getFileByPath(path);
        if (!file) {
            throw new Error(
                `File ${path} either doesn't exist or is a folder.`
            );
        }
        const newLocation = this.getNewLocation(location, event);

        updateCacheWithLocation(newLocation);

        if (file.path !== newLocation.file.path) {
            await this.app.rename(file, newLocation.file.path);
        }
        await this.app.rewrite(file, (page) =>
            modifyFrontmatterString(page, event)
        );

        return;
    }

    async move(
        fromLocation: EventPathLocation,
        toCalendar: EditableCalendar,
        updateCacheWithLocation: (loc: EventLocation) => void
    ): Promise<void> {
        const { path, lineNumber } = fromLocation;
        if (lineNumber !== undefined) {
            throw new Error("Note calendar cannot handle inline events.");
        }
        if (!(toCalendar instanceof FullNoteCalendar)) {
            throw new Error(
                `Event cannot be moved to a note calendar from a calendar of type ${toCalendar.type}.`
            );
        }
        const file = this.app.getFileByPath(path);
        if (!file) {
            throw new Error(`File ${path} not found.`);
        }
        const destDir = toCalendar.directory;
        const newPath = `${destDir}/${file.name}`;
        updateCacheWithLocation({
            file: { path: newPath },
            lineNumber: undefined,
        });
        await this.app.rename(file, newPath);
    }

    deleteEvent({ path, lineNumber }: EventPathLocation): Promise<void> {
        if (lineNumber !== undefined) {
            throw new Error("Note calendar cannot handle inline events.");
        }
        const file = this.app.getFileByPath(path);
        if (!file) {
            throw new Error(`File ${path} not found.`);
        }
        return this.app.delete(file);
    }
}
