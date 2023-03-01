import ical from "ical.js";
import { OFCEvent, validateEvent } from "../types";
import { DateTime } from "luxon";

function getDate(t: ical.Time): string {
    return DateTime.fromJSDate(t.toJSDate()).toISODate();
}

function getTime(t: ical.Time): string {
    if (t.isDate) {
        return "00:00";
    }
    return DateTime.fromJSDate(t.toJSDate()).toISOTime({
        includeOffset: false,
        includePrefix: false,
        suppressMilliseconds: true,
        suppressSeconds: true,
    });
}

function extractEventUrl(iCalEvent: ical.Event): string {
    let urlProp = iCalEvent.component.getFirstProperty("url");
    return urlProp ? urlProp.getFirstValue() : "";
}

function specifiesEnd(iCalEvent: ical.Event) {
    return (
        Boolean(iCalEvent.component.getFirstProperty("dtend")) ||
        Boolean(iCalEvent.component.getFirstProperty("duration"))
    );
}

function icsToOFC(input: ical.Event): OFCEvent {
    if (input.isRecurring()) {
        throw new Error("Recurring events not supported for ICS calendars");
    } else {
        const date = getDate(input.startDate);
        const endDate =
            specifiesEnd(input) && input.endDate
                ? getDate(input.endDate)
                : undefined;
        const allDay = input.startDate.isDate;
        return {
            type: "single",
            id: input.uid,
            title: input.summary,
            date,
            endDate: date !== endDate ? endDate : undefined,
            ...(allDay
                ? { allDay: true }
                : {
                      allDay: false,
                      startTime: getTime(input.startDate),
                      endTime: getTime(input.endDate),
                  }),
        };
    }
}

export function getEventsFromICS(text: string): OFCEvent[] {
    const jCalData = ical.parse(text);
    const component = new ical.Component(jCalData);
    const events: ical.Event[] = component
        .getAllSubcomponents("vevent")
        .map((vevent) => new ical.Event(vevent))
        .filter((evt) => {
            evt.iterator;
            try {
                evt.startDate.toJSDate();
                evt.endDate.toJSDate();
                return true;
            } catch (err) {
                // skipping events with invalid time
                return false;
            }
        });

    return events
        .map((e) => icsToOFC(e))
        .map(validateEvent)
        .flatMap((e) => (e ? [e] : []));
}
