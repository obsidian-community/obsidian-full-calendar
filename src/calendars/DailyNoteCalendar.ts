import moment from "moment";
import { TFile } from "obsidian";
import {
    appHasDailyNotesPluginLoaded,
    createDailyNote,
    getAllDailyNotes,
    getDailyNote,
    getDailyNoteSettings,
    getDateFromFile,
} from "obsidian-daily-notes-interface";
import { EventPathLocation } from "src/core/EventStore";
import { ObsidianInterface } from "src/ObsidianAdapter";
import {
    addToHeading,
    getAllInlineEventsFromFile,
    getInlineEventFromLine,
    getListsUnderHeading,
    modifyListItem,
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
        const m = moment(event.date);
        let file = getDailyNote(m, getAllDailyNotes());
        if (!file) {
            file = await createDailyNote(m);
        }
        // Since we're relying on Obsidian's markdown parsing for header and list info
        // wait until the cache is populated before continuing, since this might be
        // a new file.
        await this.app.read(file);
        const metadata = this.app.getMetadata(file);
        if (!metadata) {
            throw new Error("No metadata for file " + file.path);
        }
        const headingInfo = metadata.headings?.find(
            (h) => h.heading == this.heading
        );
        if (!headingInfo) {
            throw new Error(
                `Could not find heading ${this.heading} in daily note ${file.path}.`
            );
        }
        let lineNumber = await this.app.rewrite(file, (contents) => {
            const { page, lineNumber } = addToHeading(contents, {
                heading: headingInfo,
                item: event,
                headingText: this.heading,
            });
            return [page, lineNumber] as [string, number];
        });
        return { file, lineNumber };
    }

    private getConcreteLocation({ path, lineNumber }: EventPathLocation): {
        file: TFile;
        lineNumber: number;
    } {
        const file = this.app.getFileByPath(path);
        if (!file) {
            throw new Error(`File not found at path: ${path}`);
        }
        if (!lineNumber) {
            throw new Error(`Daily note events must have a line number.`);
        }
        return { file, lineNumber };
    }

    async deleteEvent(loc: EventPathLocation): Promise<void> {
        const { file, lineNumber } = this.getConcreteLocation(loc);
        this.app.rewrite(file, (contents) => {
            let lines = contents.split("\n");
            lines.splice(lineNumber, 1);
            return lines.join("\n");
        });
    }

    async modifyEvent(
        loc: EventPathLocation,
        newEvent: OFCEvent,
        updateLocation: (loc: EventLocation) => void
    ): Promise<void> {
        // console.log("modified daily note event");
        if (newEvent.type === "recurring") {
            throw new Error(
                "Recurring events in daily notes are not supported."
            );
        }
        if (newEvent.endDate) {
            throw new Error(
                "Multi-day events are not supported in daily notes."
            );
        }
        const { file, lineNumber } = this.getConcreteLocation(loc);
        const oldDate = getDateFromFile(file, "day")?.format(DATE_FORMAT);
        if (!oldDate) {
            throw new Error(
                `Could not get date from file at path ${file.path}`
            );
        }
        if (newEvent.date !== oldDate) {
            // console.log("daily note event moving to a new file.");
            // Event needs to be moved to a new file.
            // TODO: Factor this out with the createFile path.
            const m = moment(newEvent.date);
            let newFile = getDailyNote(m, getAllDailyNotes());
            if (!newFile) {
                newFile = await createDailyNote(m);
            }
            await this.app.read(newFile);

            const metadata = this.app.getMetadata(newFile);
            if (!metadata) {
                throw new Error("No metadata for file " + file.path);
            }
            const headingInfo = metadata.headings?.find(
                (h) => h.heading == this.heading
            );
            if (!headingInfo) {
                throw new Error(
                    `Could not find heading ${this.heading} in daily note ${file.path}.`
                );
            }
            await this.app.rewrite(file, async (oldFileContents) => {
                let lines = oldFileContents.split("\n");
                lines.splice(lineNumber, 1);
                await this.app.rewrite(newFile, (newFileContents) => {
                    const { page, lineNumber } = addToHeading(newFileContents, {
                        heading: headingInfo,
                        item: newEvent,
                        headingText: this.heading,
                    });
                    updateLocation({ file: newFile, lineNumber });
                    return page;
                });
                return lines.join("\n");
            });
        } else {
            // console.log("daily note event staying in same file.");
            updateLocation({ file, lineNumber });
            await this.app.rewrite(file, (contents) => {
                const lines = contents.split("\n");
                const newLine = modifyListItem(lines[lineNumber], newEvent);
                if (!newLine) {
                    throw new Error("Did not successfully update line.");
                }
                lines[lineNumber] = newLine;
                return lines.join("\n");
            });
        }
    }

    move(
        from: EventPathLocation,
        to: EditableCalendar
    ): Promise<EventLocation> {
        throw new Error("Method not implemented.");
    }
}
