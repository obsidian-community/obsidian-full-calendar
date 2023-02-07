import * as React from "react";
import FullCalendarPlugin from "src/main";
import { OFCEvent } from "src/types";
import { openFileForEvent } from "./actions";
import { EditEvent } from "./components/EditEvent";
import ReactModal from "./ReactModal";

export function launchCreateModal(
    plugin: FullCalendarPlugin,
    partialEvent: Partial<OFCEvent>
) {
    if (!plugin.cache) {
        return;
    }
    const calendars = [...plugin.cache.calendars.entries()].map(([id, cal]) => {
        return {
            id,
            type: cal.type,
            name: cal.name,
        };
    });
    const calIdx = 0;
    new ReactModal(plugin.app, async (closeModal) =>
        React.createElement(EditEvent, {
            initialEvent: partialEvent,
            calendars,
            defaultCalendarIndex: calIdx,
            submit: async (data, calendarIndex) => {
                // TODO: Move calendars if appropriate.
                if (calendarIndex !== calIdx) {
                    throw new Error("Cannot move event to a new calendar.");
                }
                const calendarId = calendars[calIdx].id;
                await plugin.cache?.addEvent(calendarId, data);
                closeModal();
            },
        })
    ).open();
}

export function launchEditModal(plugin: FullCalendarPlugin, eventId: string) {
    if (!plugin.cache) {
        throw new Error("Full Calendar cache is not initialized.");
    }

    const eventToEdit = plugin.cache.getEventById(eventId);
    if (!eventToEdit) {
        throw new Error("Cannot edit event that doesn't exist.");
    }
    const calId = plugin.cache.getCalendarIdForEventId(eventId);

    const calendars = [...plugin.cache.calendars.entries()].map(([id, cal]) => {
        return {
            id,
            type: cal.type,
            name: cal.name,
        };
    });

    const calIdx = calendars.findIndex(({ id }) => id === calId);

    new ReactModal(plugin.app, async (closeModal) =>
        React.createElement(EditEvent, {
            initialEvent: eventToEdit,
            calendars,
            defaultCalendarIndex: calIdx,
            submit: async (data, calendarIndex) => {
                // TODO: Move calendars if appropriate.
                if (calendarIndex !== calIdx) {
                    throw new Error("Cannot move event to a new calendar.");
                }
                await plugin.cache?.updateEventWithId(eventId, data);
                closeModal();
            },
            open: async () => {
                if (!plugin.cache) {
                    throw new Error("Plugin does not have a cache.");
                }
                openFileForEvent(plugin.cache, plugin.app, eventId);
            },
            deleteEvent: async () => {
                await plugin.cache?.deleteEvent(eventId);
            },
        })
    ).open();
}
