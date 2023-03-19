import type { Story } from "@ladle/react";
import React from "react";
import { OFCEvent } from "../../types";

import { EditEvent } from "./EditEvent";

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

const EventModal = ({
    initialEvent,
}: {
    initialEvent: Partial<OFCEvent> | undefined;
}) => (
    <div className="modal">
        <div className="modal-content">
            <EditEvent
                submit={submit}
                calendars={calendars}
                defaultCalendarIndex={0}
                initialEvent={initialEvent}
            ></EditEvent>
        </div>
    </div>
);

export const NewEvent: Story = () => (
    <EventModal initialEvent={undefined}></EventModal>
);

export const SingleEventWithTime: Story = () => (
    <EventModal
        initialEvent={{
            title: "Event title",
            type: "single",
            date: new Date().toISOString().slice(0, 10),
            allDay: false,
            startTime: "12:00",
            endTime: "13:30",
        }}
    ></EventModal>
);
SingleEventWithTime.storyName = "Single Event / Timed";

export const SingleEventAllDay: Story = () => (
    <EventModal
        initialEvent={{
            title: "Event title",
            type: "single",
            date: new Date().toISOString().slice(0, 10),
            allDay: true,
        }}
    ></EventModal>
);
SingleEventAllDay.storyName = "Single Event / All Day";

export const RecurringEvent: Story = () => (
    <EventModal
        initialEvent={{
            title: "Event title",
            type: "recurring",
            startRecur: new Date().toISOString().slice(0, 10),
            allDay: false,
            startTime: "12:00",
            endTime: "13:30",
            daysOfWeek: ["M", "R"],
        }}
    ></EventModal>
);
