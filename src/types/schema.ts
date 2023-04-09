import { z, ZodError } from "zod";
import { DateTime, Duration } from "luxon";

const stripTime = (date: DateTime) => {
    // Strip time from luxon dateTime.
    return DateTime.fromObject(
        {
            year: date.year,
            month: date.month,
            day: date.day,
        },
        { zone: "utc" }
    );
};

const parsedDate = () => z.string();
// z.string().transform((val, ctx) => {
//     const parsed = DateTime.fromISO(val, { zone: "utc" });
//     if (parsed.invalidReason) {
//         ctx.addIssue({
//             code: z.ZodIssueCode.custom,
//             message: parsed.invalidReason,
//         });
//         return z.NEVER;
//     }
//     return stripTime(parsed);
// });

const stringDate = () =>
    z
        .string()
        .or(z.date())
        .transform((arg) => new Date(arg));

const parsedTime = () => z.string();
// z.string().transform((val, ctx) => {
//     let parsed = DateTime.fromFormat(val, "h:mm a");
//     if (parsed.invalidReason) {
//         parsed = DateTime.fromFormat(val, "HH:mm");
//     }

//     if (parsed.invalidReason) {
//         ctx.addIssue({
//             code: z.ZodIssueCode.custom,
//             message: parsed.invalidReason,
//         });
//         return z.NEVER;
//     }

//     return Duration.fromISOTime(
//         parsed.toISOTime({
//             includeOffset: false,
//             includePrefix: false,
//         })
//     );
// });

export const TimeSchema = z.union([
    z.object({ allDay: z.literal(true) }),
    z.object({
        allDay: z.literal(false).default(false),
        startTime: parsedTime(),
        endTime: parsedTime().nullable().default(null),
    }),
]);

export const CommonSchema = z.object({
    title: z.string(),
    id: z.string().optional(),
});

export const EventSchema = z.union([
    z.object({
        type: z.literal("single").optional(),
        date: z.string(),
        endDate: parsedDate().nullable().default(null),
        completed: z
            .string()
            .or(z.literal(false))
            .or(z.literal(null))
            .optional(),
    }),
    z.object({
        type: z.literal("recurring"),
        // daysOfWeek: z.array(z.enum(["U", "M", "T", "W", "R", "F", "S"])),
        daysOfWeek: z.array(z.string()),
        startRecur: parsedDate().optional(),
        endRecur: parsedDate().optional(),
    }),
    z.object({
        type: z.literal("rrule"),
        startDate: parsedDate(),
        rrule: z.string(),
        skipDates: z.array(parsedDate()),
    }),
]);

type EventType = z.infer<typeof EventSchema>;
type TimeType = z.infer<typeof TimeSchema>;
type CommonType = z.infer<typeof CommonSchema>;

export type OFCEvent = CommonType & TimeType & EventType;

export function parseEvent(obj: unknown): OFCEvent {
    const commonInfo = CommonSchema.parse(obj);
    const timeInfo = TimeSchema.parse(obj);
    const eventInfo = EventSchema.parse(obj);
    return { ...commonInfo, ...timeInfo, ...eventInfo };
}

export function validateEvent(obj: unknown): OFCEvent | null {
    try {
        return parseEvent(obj);
    } catch (e) {
        if (e instanceof ZodError) {
            console.debug("Parsing failed with errors", {
                obj,
                message: e.message,
            });
        }
        return null;
    }
}
type Json =
    | { [key: string]: Json }
    | Json[]
    | string
    | number
    | true
    | false
    | null;

export function serializeEvent(obj: OFCEvent): Json {
    return { ...obj };
}
