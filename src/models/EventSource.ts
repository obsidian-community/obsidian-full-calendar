import { EventSourceInput } from "@fullcalendar/core";
import { FCError, Result } from "src/types";

export abstract class EventSource {
	abstract toApi(): Promise<Result<EventSourceInput>>;
}
