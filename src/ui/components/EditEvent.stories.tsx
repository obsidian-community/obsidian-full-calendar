import type { Story, StoryDefault } from "@ladle/react";
import React from "react";
import { OFCEvent } from "../../types";

import { EditEvent } from "./EditEvent";

export default {
    decorators: [
        (Component) => (
            <div className="modal">
                <div className="modal-content">
                    <Component />
                </div>
            </div>
        ),
    ],
} satisfies StoryDefault;

const calendars = [
    { id: "local::calendar", name: "local calendar", type: "local" as "local" },
    {
        id: "local::calendar2",
        name: "second calendar",
        type: "local" as "local",
    },
    {
        id: "dailynote::calendar",
        name: "Daily Note Calendar",
        type: "dailynote" as "dailynote",
    },
];

const submit = async function (
    event: OFCEvent,
    calendarIndex: number
): Promise<void> {
    alert("Event submitted, see console for details");
    console.log({ event, calendarIndex });
};

export const NewEvent: Story = () => (
    <EditEvent
        submit={submit}
        calendars={calendars}
        defaultCalendarIndex={0}
    ></EditEvent>
);

export const SingleEventWithTime: Story = () => (
    <EditEvent
        submit={submit}
        calendars={calendars}
        defaultCalendarIndex={0}
        initialEvent={{
            title: "Event title",
            type: "single",
            date: new Date().toISOString().slice(0, 10),
            allDay: false,
            startTime: "12:00",
            endTime: "13:30",
        }}
    ></EditEvent>
);
SingleEventWithTime.storyName = "Single Event / Timed";

export const SingleEventAllDay: Story = () => (
    <EditEvent
        submit={submit}
        calendars={calendars}
        defaultCalendarIndex={0}
        initialEvent={{
            title: "Event title",
            type: "single",
            date: new Date().toISOString().slice(0, 10),
            allDay: true,
        }}
    ></EditEvent>
);
SingleEventAllDay.storyName = "Single Event / All Day";

export const RecurringEvent: Story = () => (
    <EditEvent
        submit={submit}
        calendars={calendars}
        defaultCalendarIndex={0}
        initialEvent={{
            title: "Event title",
            type: "recurring",
            startRecur: new Date().toISOString().slice(0, 10),
            allDay: false,
            startTime: "12:00",
            endTime: "13:30",
            daysOfWeek: ["M", "R"],
        }}
    ></EditEvent>
);
