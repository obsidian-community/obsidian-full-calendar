import { EventSourceInput } from "@fullcalendar/core";
import { FCError, CalDAVSource, ICloudSource } from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
    expandICalEvents,
    makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import Color from "color";
import * as dav from "dav";
import * as transport from "src/parsing/caldav/transport";
import { EventSource } from "./EventSource";
import { getColors } from "./util";

export class RemoteSource extends EventSource {
    info: CalDAVSource | ICloudSource;
    constructor(info: CalDAVSource | ICloudSource) {
        super();
        this.info = info;
    }

    async importCalendars(): Promise<CalDAVSource[] | FCError> {
        try {
            let xhr = new transport.Basic(
                new dav.Credentials({
                    username: this.info.username,
                    password: this.info.password,
                })
            );
            let account = await dav.createAccount({
                xhr: xhr,
                server: this.info.url,
                loadObjects: false,
                loadCollections: true,
            });

            let colorRequest = dav.request.propfind({
                props: [
                    { name: "calendar-color", namespace: dav.ns.CALDAV_APPLE },
                ],
                depth: "0",
            });

            return (
                await Promise.all(
                    account.calendars.map(async (calendar) => {
                        if (!calendar.components.includes("VEVENT")) {
                            return null;
                        }
                        let colorResponse = await xhr.send(
                            colorRequest,
                            calendar.url
                        );
                        let color = colorResponse[0].props?.calendarColor;
                        return {
                            ...this.info,
                            type: "caldav",
                            name: calendar.displayName,
                            homeUrl: calendar.url,
                            color: color ? Color(color).hex() : this.info.color,
                        };
                    })
                )
            ).filter((source): source is CalDAVSource => source != null);
        } catch (e) {
            console.error(`Error importing calendars from ${this.info.url}`);
            console.error(e);
            return new FCError(
                `There was an error loading a calendar. Check the console for full details.`
            );
        }
    }

    async toApi(): Promise<EventSourceInput | FCError> {
        let expanders: (IcalExpander | FCError)[] = [];
        const getExpanders = async (): Promise<(IcalExpander | FCError)[]> => {
            if (expanders.length) {
                return expanders;
            }
            try {
                let xhr = new transport.Basic(
                    new dav.Credentials({
                        username: this.info.username,
                        password: this.info.password,
                    })
                );
                let account = await dav.createAccount({
                    xhr: xhr,
                    server: this.info.url,
                });
                let calendar = account.calendars.find(
                    (calendar) => calendar.url === this.info.homeUrl
                );
                if (!calendar) {
                    return [
                        new FCError(
                            `There was an error loading a calendar event. Check the console for full details.`
                        ),
                    ];
                }

                // TODO: Calendar.calendarData might have the ICS string???
                let events = await dav.listCalendarObjects(calendar, {
                    xhr: xhr,
                });

                expanders = events
                    .map((vevent) => {
                        try {
                            return vevent?.calendarData
                                ? makeICalExpander(vevent.calendarData)
                                : null;
                        } catch (e) {
                            console.error("Unable to parse calendar");
                            console.error(e);
                            new FCError(
                                `There was an error loading a calendar event. Check the console for full details.`
                            );
                        }
                    })
                    .filter((expander): expander is IcalExpander => !!expander);
                return expanders;
            } catch (e) {
                console.error(`Error loading calendar from ${this.info.url}`);
                console.error(e);
                return [
                    new FCError(
                        `There was an error loading a calendar. Check the console for full details.`
                    ),
                ];
            }
        };
        return {
            events: async function ({ start, end }) {
                const icals = await getExpanders();
                const events = icals
                    .flatMap((ical) => {
                        if (ical instanceof FCError) {
                            console.error("Unable to parse calendar");
                            console.error(ical);
                            return null;
                        } else {
                            return expandICalEvents(ical, {
                                start,
                                end,
                            });
                        }
                    })
                    .filter((e): e is EventSource => !!e);
                return events;
            },
            editable: false,
            ...getColors(this.info.color),
        };
    }
}
