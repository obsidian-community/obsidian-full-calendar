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

const parsedDate = () =>
    z.string().transform((val, ctx) => {
        const parsed = DateTime.fromISO(val, { zone: "utc" });
        if (parsed.invalidReason) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: parsed.invalidReason,
            });
            return z.NEVER;
        }
        return stripTime(parsed);
    });

const stringDate = () =>
    z
        .string()
        .or(z.date())
        .transform((arg) => new Date(arg));

const parsedTime = () =>
    z.string().transform((val, ctx) => {
        let parsed = DateTime.fromFormat(val, "h:mm a");
        if (parsed.invalidReason) {
            parsed = DateTime.fromFormat(val, "HH:mm");
        }

        if (parsed.invalidReason) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: parsed.invalidReason,
            });
            return z.NEVER;
        }

        return Duration.fromISOTime(
            parsed.toISOTime({
                includeOffset: false,
                includePrefix: false,
            })
        );
    });

const TimeSchema = z.discriminatedUnion("allDay", [
    z.object({ allDay: z.literal(true) }),
    z.object({
        allDay: z.literal(false).default(false),
        startTime: parsedTime(),
        endTime: parsedTime().optional(),
    }),
]);

const CommonSchema = z.object({ title: z.string(), id: z.string().optional() });

const EventSchema = z.union([
    z
        .object({
            type: z.literal("single").default("single"),
            date: parsedDate(),
            endDate: parsedDate().optional(),
            completed: stringDate()
                .or(z.boolean())
                .or(z.literal(null))
                .optional(),
        })
        .merge(CommonSchema),
    z
        .object({
            type: z.literal("recurring"),
            daysOfWeek: z.array(z.enum(["U", "M", "T", "W", "R", "F", "S"])),
            startRecur: parsedDate().optional(),
            endRecur: parsedDate().optional(),
        })
        .merge(CommonSchema),
    z
        .object({
            type: z.literal("rrule"),
            startDate: parsedDate(),
            rrule: z.string(),
            skipDates: z.array(parsedDate()),
        })
        .merge(CommonSchema),
]);

type EventType = z.infer<typeof EventSchema>;
type TimeType = z.infer<typeof TimeSchema>;

export type OFCEvent = EventType & TimeType;

export function parseEvent(obj: any): OFCEvent {
    const timeInfo = TimeSchema.parse(obj);
    const eventInfo = EventSchema.parse(obj);
    return { ...eventInfo, ...timeInfo };
}

export function validateEvent(obj: any): OFCEvent | null {
    try {
        return parseEvent(obj);
    } catch (e) {
        if (e instanceof ZodError) {
            console.debug("Parsing failed with errors", e.message);
        }
        return null;
    }
}
