import Color from "color";
import dav, { transport } from "dav";
import { Authentication, CalDAVSource } from "src/types";

export async function importCalendars(
    auth: Authentication,
    url: string
): Promise<CalDAVSource[]> {
    try {
        let xhr = new transport.Basic(
            new dav.Credentials({
                username: auth.username,
                password: auth.password,
            })
        );
        let account = await dav.createAccount({
            xhr: xhr,
            server: url,
            loadObjects: false,
            loadCollections: true,
        });

        let colorRequest = dav.request.propfind({
            props: [{ name: "calendar-color", namespace: dav.ns.CALDAV_APPLE }],
            depth: "0",
        });

        const calendars = await Promise.all(
            account.calendars.map(async (calendar) => {
                if (!calendar.components.includes("VEVENT")) {
                    return null;
                }
                let colorResponse = await xhr.send(colorRequest, calendar.url);
                let color = colorResponse[0].props?.calendarColor;
                return {
                    name: calendar.displayName,
                    url: calendar.url,
                    color: color ? (Color(color).hex() as string) : null,
                };
            })
        );
        return calendars
            .flatMap((c) => (c ? c : []))
            .map((c) => ({
                type: "caldav",
                name: c.name,
                url,
                homeUrl: c.url,
                color: c.color || (null as any), // TODO: handle null colors in the type system.
                username: auth.username,
                password: auth.password,
            }));
    } catch (e) {
        console.error(`Error importing calendars from ${url}`, e);
        console.error(e);
        throw e;
    }
}
