import { EventSourceInput } from "@fullcalendar/core";
import { FCError } from "src/types";

export abstract class EventSource {
    abstract toApi(): Promise<EventSourceInput | FCError>;
}
