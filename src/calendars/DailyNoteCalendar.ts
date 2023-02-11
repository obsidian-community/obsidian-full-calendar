import { TFile } from "obsidian";
import { EventPathLocation } from "src/core/EventStore";
import { OFCEvent, EventLocation, CalendarInfo } from "src/types";
import { EventResponse } from "./Calendar";
import { EditableCalendar, EditableEventResponse } from "./EditableCalendar";

export default class DailyNoteCalendar extends EditableCalendar {
    get type(): CalendarInfo["type"] {
        return "dailynote";
    }
    get id(): string {
        throw new Error("Method not implemented.");
    }
    get name(): string {
        throw new Error("Method not implemented.");
    }
    get directory(): string {
        throw new Error("Method not implemented.");
    }

    async getEventsInFile(file: TFile): Promise<EditableEventResponse[]> {
        throw new Error("Method not implemented.");
    }

    async getEvents(): Promise<EventResponse[]> {
        throw new Error("Method not implemented.");
    }

    async createEvent(event: OFCEvent): Promise<EventLocation> {
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
