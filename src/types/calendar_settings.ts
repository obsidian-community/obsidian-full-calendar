import { ZodError, z } from "zod";
import { OFCEvent } from "./schema";

const calendarOptionsSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("local"), directory: z.string() }),
    z.object({ type: z.literal("dailynote"), heading: z.string() }),
    z.object({ type: z.literal("ical"), url: z.string().url() }),
    z.object({
        type: z.literal("caldav"),
        name: z.string(),
        url: z.string().url(),
        homeUrl: z.string().url(),
        username: z.string(),
        password: z.string(),
    }),
]);

const colorValidator = z.object({ color: z.string() });

export type TestSource = {
    type: "FOR_TEST_ONLY";
    id: string;
    events?: OFCEvent[];
};

export type CalendarInfo = (
    | z.infer<typeof calendarOptionsSchema>
    | TestSource
) &
    z.infer<typeof colorValidator>;

export function parseCalendarInfo(obj: unknown): CalendarInfo {
    const options = calendarOptionsSchema.parse(obj);
    const color = colorValidator.parse(obj);

    return { ...options, ...color };
}

export function safeParseCalendarInfo(obj: unknown): CalendarInfo | null {
    try {
        return parseCalendarInfo(obj);
    } catch (e) {
        if (e instanceof ZodError) {
            console.debug("Parsing calendar info failed with errors", {
                obj,
                error: e.message,
            });
        }
        return null;
    }
}
