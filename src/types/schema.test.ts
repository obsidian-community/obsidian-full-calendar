import {
    CommonSchema,
    EventSchema,
    OFCEvent,
    TimeSchema,
    parseEvent,
    serializeEvent,
} from "./schema";
import fc from "fast-check";
import { ZodFastCheck } from "zod-fast-check";

describe("schema parsing tests", () => {
    describe("single events", () => {
        it("simplest", () => {
            expect(
                parseEvent({
                    title: "Test",
                    date: "2021-01-01",
                    allDay: true,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                }
            `);
        });
        it("explicit type", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: true,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("truncates time from date", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: true,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("start time", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01T10:30:00.000Z",
                    allDay: false,
                    startTime: "10:30",
                    endTime: null,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": false,
                  "date": "2021-01-01T10:30:00.000Z",
                  "endDate": null,
                  "endTime": null,
                  "startTime": "10:30",
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("am/pm start time", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: false,
                    startTime: "10:30 pm",
                    endTime: null,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": false,
                  "date": "2021-01-01",
                  "endDate": null,
                  "endTime": null,
                  "startTime": "10:30 pm",
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("end time", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: false,
                    startTime: "10:30",
                    endTime: "11:45",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": false,
                  "date": "2021-01-01",
                  "endDate": null,
                  "endTime": "11:45",
                  "startTime": "10:30",
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("multi-day events", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    endDate: "2021-01-03",
                    allDay: true,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "date": "2021-01-01",
                  "endDate": "2021-01-03",
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("to-do", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: true,
                    completed: null,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "completed": null,
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("to-do unchecked", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: true,
                    completed: false,
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "completed": false,
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
        it("to-do completed", () => {
            expect(
                parseEvent({
                    title: "Test",
                    type: "single",
                    date: "2021-01-01",
                    allDay: true,
                    completed: "2021-01-01T10:30:00.000Z",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "completed": "2021-01-01T10:30:00.000Z",
                  "date": "2021-01-01",
                  "endDate": null,
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
    });
    describe("simple recurring events", () => {
        it("recurs once per week", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "recurring",
                    daysOfWeek: ["M"],
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "daysOfWeek": [
                    "M",
                  ],
                  "title": "Test",
                  "type": "recurring",
                }
            `);
        });
        it("recurs twice per week", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "recurring",
                    daysOfWeek: ["M", "W"],
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "daysOfWeek": [
                    "M",
                    "W",
                  ],
                  "title": "Test",
                  "type": "recurring",
                }
            `);
        });
        it("recurs with start date", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "recurring",
                    daysOfWeek: ["M"],
                    startRecur: "2023-01-05",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "daysOfWeek": [
                    "M",
                  ],
                  "startRecur": "2023-01-05",
                  "title": "Test",
                  "type": "recurring",
                }
            `);
        });
        it("recurs with end date", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "recurring",
                    daysOfWeek: ["M"],
                    endRecur: "2023-01-05",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "daysOfWeek": [
                    "M",
                  ],
                  "endRecur": "2023-01-05",
                  "title": "Test",
                  "type": "recurring",
                }
            `);
        });
        it("recurs with both start and end dates", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "recurring",
                    daysOfWeek: ["M"],
                    startRecur: "2023-01-05",
                    endRecur: "2023-05-12",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "daysOfWeek": [
                    "M",
                  ],
                  "endRecur": "2023-05-12",
                  "startRecur": "2023-01-05",
                  "title": "Test",
                  "type": "recurring",
                }
            `);
        });
    });
    describe("rrule events", () => {
        it("basic rrule", () => {
            expect(
                parseEvent({
                    title: "Test",
                    allDay: true,
                    type: "rrule",
                    id: "hi",
                    rrule: "RRULE",
                    skipDates: [],
                    startDate: "2023-01-05",
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": true,
                  "id": "hi",
                  "rrule": "RRULE",
                  "skipDates": [],
                  "startDate": "2023-01-05",
                  "title": "Test",
                  "type": "rrule",
                }
            `);
        });
    });

    it("parses", () => {
        const CommonArb = ZodFastCheck().inputOf(CommonSchema);
        const TimeArb = ZodFastCheck().inputOf(TimeSchema);
        const EventArb = ZodFastCheck().inputOf(EventSchema);
        const EventInputArbitrary = fc
            .tuple(CommonArb, TimeArb, EventArb)
            .map(([common, time, event]) => ({
                ...common,
                ...time,
                ...event,
            }));

        fc.assert(
            fc.property(EventInputArbitrary, (obj) => {
                expect(() => parseEvent(obj)).not.toThrow();
            })
        );
    });

    it("roundtrips", () => {
        const CommonArb = ZodFastCheck().outputOf(CommonSchema);
        const TimeArb = ZodFastCheck().outputOf(TimeSchema);
        const EventArb = ZodFastCheck().outputOf(EventSchema);
        const OFCEventArbitrary: fc.Arbitrary<OFCEvent> = fc
            .tuple(CommonArb, TimeArb, EventArb)
            .map(([common, time, event]) => ({
                ...common,
                ...time,
                ...event,
            }));

        fc.assert(
            fc.property(OFCEventArbitrary, (event) => {
                const obj = serializeEvent(event);
                const newParsedEvent = parseEvent(obj);
                expect(newParsedEvent).toEqual(event);
            })
        );
    });
});
