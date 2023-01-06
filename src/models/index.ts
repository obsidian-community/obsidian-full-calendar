import { MetadataCache, Vault } from "obsidian";
import { DailyNoteCalendarSource, FCError } from "src/types";
import { ICSEvent } from "./ICSEvent";
import { NoteEvent } from "./NoteEvent";
import { CalDAVEvent } from "./CalDAVEvent";
import { DailyNoteEvent } from "./DailyNoteEvent";
import { CalendarEvent } from "./Event";
import { EventApi } from "@fullcalendar/core";
import { FullCalendarSettings } from "src/ui/settings";

export async function eventFromApi(
    cache: MetadataCache,
    vault: Vault,
    settings: FullCalendarSettings,
    event: EventApi
) {
    const [prefix, ...rest] = event.id.split(CalendarEvent.ID_SEPARATOR);
    switch (prefix) {
        case ICSEvent.ID_PREFIX:
        case CalDAVEvent.ID_PREFIX:
            throw new FCError(
                "Cannot create instance of ICS event given its ID."
            );
        case NoteEvent.ID_PREFIX: {
            const path = rest.join(CalendarEvent.ID_SEPARATOR);
            return NoteEvent.fromPath(cache, vault, path);
        }
        case DailyNoteEvent.ID_PREFIX: {
            const [path, idx] = rest;
            const { lineNumber } = event.extendedProps;
            const dailyNoteCal = settings.calendarSources.flatMap((c) =>
                c.type === "dailynote" ? [c] : []
            )[0];
            if (!dailyNoteCal) {
                throw new FCError("Daily note calendar not loaded.");
            }

            return DailyNoteEvent.fromPath(
                cache,
                vault,
                path,
                lineNumber,
                dailyNoteCal.heading
            );
        }
    }
}
