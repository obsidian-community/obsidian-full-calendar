import { request } from "obsidian";
import { CalendarInfo } from "src/types";
import { Calendar, EventResponse } from "./Calendar";
import { getEventsFromICS } from "src/parsing/ics";
const WEBCAL = "webcal";

export default class ICSCalendar extends Calendar {
    private url: string;
    // private data: FullCalendar | null = null;

    constructor(color: string, url: string) {
        super(color);
        this.url = url;
    }

    get type(): CalendarInfo["type"] {
        return "ical";
    }

    get identifier(): string {
        return this.url;
    }
    get name(): string {
        return this.url;
    }

    async getEvents(): Promise<EventResponse[]> {
        let url = this.url;
        if (url.startsWith(WEBCAL)) {
            url = "https" + url.slice(WEBCAL.length);
        }
        const response = await request({
            url,
            method: "GET",
        });

        return getEventsFromICS(response).map((e) => [e, null]);
    }
}
