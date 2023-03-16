import ical from "ical.js";
import { OFCEvent, validateEvent } from "../types";
import { DateTime } from "luxon";
import { rrulestr } from "rrule";

function getDate(t: ical.Time): string {
    return DateTime.fromSeconds(t.toUnixTime(), { zone: "UTC" }).toISODate();
}

function getTime(t: ical.Time): string {
    if (t.isDate) {
        return "00:00";
    }
    return DateTime.fromSeconds(t.toUnixTime(), { zone: "UTC" }).toISOTime({
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
        const rrule = rrulestr(
            input.component.getFirstProperty("rrule").getFirstValue().toString()
        );
        const allDay = input.startDate.isDate;
        const exdates = input.component
            .getAllProperties("exdate")
            .map((exdateProp) => {
                const exdate = exdateProp.getFirstValue();
                // NOTE: We only store the date from an exdate and recreate the full datetime exdate later,
                // so recurring events with exclusions that happen more than once per day are not supported.
                return getDate(exdate);
            });
        return {
            type: "rrule",
            title: input.summary,
            id: input.uid,
            rrule: rrule.toString(),
            skipDates: exdates,
            startDate: getDate(
                input.startDate.convertToZone(ical.Timezone.utcTimezone)
            ),
            ...(allDay
                ? { allDay: true }
                : {
                      allDay: false,
                      startTime: getTime(
                          input.startDate.convertToZone(
                              ical.Timezone.utcTimezone
                          )
                      ),
                      endTime: getTime(
                          input.endDate.convertToZone(ical.Timezone.utcTimezone)
                      ),
                  }),
        };
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

    // TODO: Timezone support
    // const tzc = component.getAllSubcomponents("vtimezone");
    // const tz = new ical.Timezone(tzc[0]);

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
