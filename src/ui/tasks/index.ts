import { DateTime } from "luxon";
import { OFCEvent } from "src/types";

export const isTask = (e: OFCEvent) =>
    e.type === "single" && e.completed !== undefined && e.completed !== null;

export const unmakeTask = (event: OFCEvent): OFCEvent => {
    if (event.type !== "single") {
        return event;
    }
    return { ...event, completed: null };
};

export const toggleTask = (event: OFCEvent, isDone: boolean): OFCEvent => {
    if (event.type !== "single") {
        return event;
    }
    if (isDone) {
        return { ...event, completed: DateTime.now().toISO() };
    } else {
        return { ...event, completed: false };
    }
};
