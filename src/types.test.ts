import { validateEvent } from "./types";

describe("validation tests", () => {
    it.each([
        [
            "basic allDay",
            {
                title: "Test Event",
                allDay: true,
                date: "2022-01-01",
                type: "single",
            },
        ],
        [
            "basic allDay toDo",
            {
                title: "Test Event",
                allDay: true,
                date: "2022-01-01",
                completed: "x",
                type: "single",
            },
        ],
    ])("%p roundtrips", (_, event) => {
        expect(validateEvent(event)).toEqual(event);
    });
});
