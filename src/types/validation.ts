import { AllDayData, OFCEvent, RangeTimeData } from ".";

// TODO: Replace with Zod validator (https://github.com/colinhacks/zod)
/*
 * Validates that an incoming object from a JS object (presumably parsed from a note's frontmatter)
 * is a valid event, and returns that event if so. If any required fields are missing, then returns null.
 */
export function validateEvent(obj?: Record<string, any>): OFCEvent | null {
    if (obj === undefined) {
        return null;
    }

    if (!obj.title) {
        return null;
    }

    if (!obj.allDay && !obj.startTime) {
        return null;
    }

    const timeInfo: RangeTimeData | AllDayData = obj.allDay
        ? { allDay: true }
        : {
              startTime: obj.startTime,
              endTime: obj.endTime,
          };

    if (obj.type === undefined || obj.type === "single") {
        if (!obj.date) {
            return null;
        }
        const event: OFCEvent = {
            title: obj.title,
            type: "single",
            date: obj.date,
            ...timeInfo,
        };
        if (obj.completed !== undefined || obj.completed !== null) {
            event.completed = obj.completed;
        }
        if (obj.endDate) {
            event.endDate = obj.endDate;
        }
        if (obj.id) {
            event.id = obj.id;
        }
        return event;
    } else if (obj.type === "recurring") {
        if (obj.daysOfWeek === undefined) {
            return null;
        }
        const event: OFCEvent = {
            title: obj.title,
            type: "recurring",
            daysOfWeek: obj.daysOfWeek,
            startRecur: obj.startRecur,
            endRecur: obj.endRecur,
            ...timeInfo,
        };
        if (obj.id) {
            event.id = obj.id;
        }
        return event;
    } else if (obj.type === "rrule") {
        if (!obj.rrule) {
            return null;
        }
        if (!obj.startDate) {
            return null;
        }

        const event: OFCEvent = {
            type: "rrule",
            title: obj.title,
            rrule: obj.rrule,
            skipDates: obj.skipDates,
            startDate: obj.startDate,
            ...timeInfo,
        };
        if (obj.id) {
            event.id = obj.id;
        }
        return event;
    }

    return null;
}
