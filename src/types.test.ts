import { validateEvent } from "./types";

describe("validation tests", () => {
    it.each([
        [
            "basic allDay",
            { title: "Test Event", allDay: true, date: "2022-01-01" },
        ],
        [
            "basic allDay toDo",
            {
                title: "Test Event",
                allDay: true,
                date: "2022-01-01",
                completed: "x",
            },
        ],
    ])("%p roundtrips", (_, event) => {
        expect(validateEvent(event)).toEqual(event);
    });
});
