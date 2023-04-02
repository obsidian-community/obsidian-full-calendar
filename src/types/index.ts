import { OFCEvent } from "./schema";

export type { OFCEvent } from "./schema";
export { validateEvent } from "./schema";
export const PLUGIN_SLUG = "full-calendar-plugin";

// Settings

type CalendarSourceCommon = {
    color: string;
};

/**
 * Local calendar with events stored as files in a directory.
 */
export type LocalCalendarSource = {
    type: "local";
    directory: string;
} & CalendarSourceCommon;

/**
 * Local calendar with events stored inline in daily notes. Under a certain heading.
 */
export type DailyNoteCalendarSource = {
    type: "dailynote";
    heading: string;
} & CalendarSourceCommon;

/**
 * Public google calendars using the FullCalendar integration.
 */
export type GoogleCalendarSource = {
    type: "gcal";
    url: string;
} & CalendarSourceCommon;

/**
 * Readonly mirror of a remote calendar located at the given URL.
 */
export type ICalSource = {
    type: "ical";
    url: string;
} & CalendarSourceCommon;

/**
 * Auth types. Currently only support Basic, but will probably support OAuth in the future.
 */
type BasicAuth = {
    username: string;
    password: string;
} & CalendarSourceCommon;

type AuthType = BasicAuth;

/**
 * Read/write mirror of a remote CalDAV backed calendar at the given URL.
 */
export type CalDAVSource = {
    type: "caldav";
    name: string;
    url: string;
    homeUrl: string;
} & CalendarSourceCommon &
    AuthType;

/**
 * An read/write mirror of an iCloud backed calendar.
 */
export type ICloudSource = Omit<CalDAVSource, "type" | "url"> & {
    type: "icloud";
    url: "https://caldav.icloud.com";
};

export type TestSource = {
    type: "FOR_TEST_ONLY";
    id: string;
    events?: OFCEvent[];
} & CalendarSourceCommon;

export type CalendarInfo =
    | LocalCalendarSource
    | DailyNoteCalendarSource
    | GoogleCalendarSource
    | ICalSource
    | CalDAVSource
    | ICloudSource
    | TestSource;

/**
 * Construct a partial calendar source of the specified type
 */
export function makeDefaultPartialCalendarSource(
    type: CalendarInfo["type"]
): Partial<CalendarInfo> {
    if (type === "icloud") {
        return {
            type: type,
            color: getComputedStyle(document.body)
                .getPropertyValue("--interactive-accent")
                .trim(),
            url: "https://caldav.icloud.com",
        } as Partial<ICloudSource>;
    }

    return {
        type: type,
        color: getComputedStyle(document.body)
            .getPropertyValue("--interactive-accent")
            .trim(),
    };
}

export class FCError {
    message: string;
    constructor(message: string) {
        this.message = message;
    }
}

export type EventLocation = {
    file: { path: string };
    lineNumber: number | undefined;
};

export type Authentication = {
    type: "basic";
    username: string;
    password: string;
};
