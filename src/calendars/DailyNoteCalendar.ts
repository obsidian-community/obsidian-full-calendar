import { TFile } from "obsidian";
import {
    appHasDailyNotesPluginLoaded,
    getAllDailyNotes,
    getDailyNoteSettings,
    getDateFromFile,
} from "obsidian-daily-notes-interface";
import { EventPathLocation } from "src/core/EventStore";
import { ObsidianInterface } from "src/ObsidianAdapter";
import {
    getAllInlineEventsFromFile,
    getListsUnderHeading,
} from "src/serialization/inline";
import { OFCEvent, EventLocation, CalendarInfo } from "src/types";
import { EventResponse } from "./Calendar";
import { EditableCalendar, EditableEventResponse } from "./EditableCalendar";

const DATE_FORMAT = "YYYY-MM-DD";
export default class DailyNoteCalendar extends EditableCalendar {
    app: ObsidianInterface;
    heading: string;

    constructor(app: ObsidianInterface, color: string, heading: string) {
        super(color);
        appHasDailyNotesPluginLoaded();
        this.app = app;
        this.heading = heading;
    }

    get type(): CalendarInfo["type"] {
        return "dailynote";
    }
    get identifier(): string {
        return this.heading;
    }
    get name(): string {
        return `Daily note under "${this.heading}"`;
    }
    get directory(): string {
        const { folder } = getDailyNoteSettings();
        if (!folder) {
            throw new Error("Could not load daily note settings.");
        }
        return folder;
    }

    async getEventsInFile(file: TFile): Promise<EditableEventResponse[]> {
        const date = getDateFromFile(file, "day")?.format(DATE_FORMAT);
        if (!date) {
            return [];
        }
        const cache = this.app.getMetadata(file);
        if (!cache) {
            return [];
        }
        const listItems = getListsUnderHeading(this.heading, cache);
        const inlineEvents = await this.app.process(file, (text) =>
            getAllInlineEventsFromFile(text, listItems, { date })
        );
        return inlineEvents.map(({ event, lineNumber }) => [
            event,
            { file, lineNumber },
        ]);
    }

    async getEvents(): Promise<EventResponse[]> {
        const notes = getAllDailyNotes();
        const files = Object.values(notes);
        return (
            await Promise.all(files.map((f) => this.getEventsInFile(f)))
        ).flat();
    }

    async createEvent(event: OFCEvent): Promise<EventLocation> {
        if (event.type == "recurring") {
            throw new Error("Cannot create a recurring event in a daily note.");
        }
        throw new Error("Method not implemented.");
    }

    async deleteEvent(location: EventPathLocation): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async modifyEvent(
        location: EventPathLocation,
        newEvent: OFCEvent,
        updateLocation: (loc: EventLocation) => void
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }

    move(
        from: EventPathLocation,
        to: EditableCalendar
    ): Promise<EventLocation> {
        throw new Error("Method not implemented.");
    }
}
