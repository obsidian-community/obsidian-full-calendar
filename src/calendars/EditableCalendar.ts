import { Calendar } from "./Calendar";

export abstract class EditableCalendar extends Calendar {
	abstract getDirectory(): string;
}
