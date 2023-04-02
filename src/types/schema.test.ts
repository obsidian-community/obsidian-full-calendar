import { parseEvent } from "./schema";

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
                  "date": "2021-01-01T00:00:00.000Z",
                  "title": "Test",
                  "type": "single",
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
                  "date": "2021-01-01T00:00:00.000Z",
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
                  "date": "2021-01-01T00:00:00.000Z",
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
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": false,
                  "date": "2021-01-01T00:00:00.000Z",
                  "startTime": "PT10H30M",
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
                })
            ).toMatchInlineSnapshot(`
                {
                  "allDay": false,
                  "date": "2021-01-01T00:00:00.000Z",
                  "startTime": "PT22H30M",
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
                  "date": "2021-01-01T00:00:00.000Z",
                  "endTime": "PT11H45M",
                  "startTime": "PT10H30M",
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
                  "date": "2021-01-01T00:00:00.000Z",
                  "endDate": "2021-01-03T00:00:00.000Z",
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
                  "date": "2021-01-01T00:00:00.000Z",
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
                  "date": "2021-01-01T00:00:00.000Z",
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
                  "completed": 2021-01-01T10:30:00.000Z,
                  "date": "2021-01-01T00:00:00.000Z",
                  "title": "Test",
                  "type": "single",
                }
            `);
        });
    });
    describe("simple recurring events", () => {});
    describe("rrule events", () => {});
});
