import { TFile } from "obsidian";
import { Calendar } from "../calendars/Calendar";
import { EventLocation, OFCEvent } from "../types";

interface Identifier {
	id: string;
}

class Path implements Identifier {
	id: string;
	constructor(file: TFile) {
		this.id = file.path;
	}
}

class EventID implements Identifier {
	id: string;
	constructor(id: string) {
		this.id = id;
	}
}

class OneToMany<T extends Identifier, FK extends Identifier> {
	private foreign: Map<string, string> = new Map();
	private related: Map<string, Set<string>> = new Map();

	clear() {
		this.foreign.clear();
		this.related.clear();
	}

	add(one: T, many: FK) {
		this.foreign.set(many.id, one.id);
		let related = this.related.get(one.id);
		if (!related) {
			related = new Set();
			this.related.set(one.id, related);
		}
		related.add(many.id);
	}

	delete(many: FK) {
		const oneId = this.foreign.get(many.id);
		if (!oneId) {
			return;
		}
		this.foreign.delete(many.id);
		const related = this.related.get(oneId);
		if (!related) {
			throw new Error(
				`Unreachable: state: relation <${oneId}> exists in the foreign map but not the related map.`
			);
		}
		related.delete(many.id);
	}

	getBy(key: T): Set<string> {
		const related = this.related.get(key.id);
		if (!related) {
			return new Set();
		}
		return new Set(related);
	}

	getRelated(key: FK): string | null {
		return this.foreign.get(key.id) || null;
	}

	get numEntries(): number {
		return this.foreign.size;
	}

	get relatedCount(): number {
		return [...this.related.values()].filter((s) => s.size > 0).length;
	}

	get groupByRelated(): Map<string, string[]> {
		const result: Map<string, string[]> = new Map();
		for (const [key, values] of this.related.entries()) {
			result.set(key, [...values.values()]);
		}
		return result;
	}
}

type StoreLoc = { path: string; lineNumber: number | undefined };

type EventResult = {
	id: string;
	event: OFCEvent;
	location: StoreLoc | null;
};

type AddEventProps = {
	calendar: Calendar;
	location: EventLocation | null;
	id: string;
	event: OFCEvent;
};

type EventDetails = Omit<AddEventProps, "location" | "calendar"> & {
	location: StoreLoc | null;
	calendarId: string;
};

/**
 * Class that stores events by their ID as the primary key, with secondary "indexes"
 * by calendar and file. You can look up events by what calendar they belong to, as
 * well as what file their source lives in.
 */
// TODO: Add a position index, just stored as a line number for now. This will be one-to-one.
export default class EventStore {
	private store: Map<string, OFCEvent> = new Map();

	private calendarIndex = new OneToMany<Calendar, EventID>();

	private pathIndex = new OneToMany<Path, EventID>();
	private lineNumbers: Map<string, number> = new Map();

	clear() {
		this.store.clear();
		this.calendarIndex.clear();
		this.pathIndex.clear();
		this.lineNumbers.clear();
	}

	get fileCount() {
		return this.pathIndex.relatedCount;
	}

	get calendarCount() {
		return this.calendarIndex.relatedCount;
	}

	get eventCount() {
		return this.store.size;
	}

	fetch(ids: string[] | Set<string>): EventResult[] {
		const result: EventResult[] = [];
		ids.forEach((id) => {
			const event = this.store.get(id);
			if (!event) {
				return;
			}
			const path = this.pathIndex.getRelated(new EventID(id));
			let lineNumber: number | undefined = undefined;
			if (path) {
				lineNumber = this.lineNumbers.get(id);
			}
			const location = path ? { path, lineNumber } : null;
			result.push({ id, event, location });
		});
		return result;
	}

	add({ calendar, location, id, event }: AddEventProps) {
		if (this.store.has(id)) {
			throw new Error(
				"Event with given ID already exists in the EventStore."
			);
		}

		this.store.set(id, event);
		this.calendarIndex.add(calendar, new EventID(id));
		if (location) {
			const { file, lineNumber } = location;
			this.pathIndex.add(new Path(file), new EventID(id));
			if (lineNumber) {
				this.lineNumbers.set(id, lineNumber);
			}
		}
	}

	delete(id: string): OFCEvent | null {
		const event = this.store.get(id);
		if (!event) {
			return null;
		}

		this.calendarIndex.delete(new EventID(id));
		this.pathIndex.delete(new EventID(id));
		this.lineNumbers.delete(id);
		this.store.delete(id);
		return event;
	}

	getEventById(id: string): OFCEvent | null {
		return this.store.get(id) || null;
	}

	getEventsInFile(file: TFile): EventResult[] {
		return this.fetch(this.pathIndex.getBy(new Path(file)));
	}

	getEventsInCalendar(calendar: Calendar): EventResult[] {
		return this.fetch(this.calendarIndex.getBy(calendar));
	}

	getEventsInFileAndCalendar(file: TFile, calendar: Calendar): EventResult[] {
		const inFile = this.pathIndex.getBy(new Path(file));
		const inCalendar = this.calendarIndex.getBy(calendar);
		return this.fetch([...inFile].filter((id) => inCalendar.has(id)));
	}

	getCalendarIdForEventId(id: string): string | null {
		return this.calendarIndex.getRelated(new EventID(id));
	}

	getFilePathForEventId(id: string): string | null {
		return this.pathIndex.getRelated(new EventID(id));
	}

	get eventsByCalendar(): Map<string, EventResult[]> {
		const result = new Map();
		for (const [k, vs] of this.calendarIndex.groupByRelated) {
			result.set(k, this.fetch(vs));
		}
		return result;
	}

	getEventDetails(eventId: string): EventDetails | null {
		const event = this.getEventById(eventId);
		const calendarId = this.getCalendarIdForEventId(eventId);
		if (!event || !calendarId) {
			return null;
		}

		const path = this.getFilePathForEventId(eventId);
		const lineNumber = this.lineNumbers.get(eventId);
		const location = path ? { path, lineNumber } : null;
		return { id: eventId, event, calendarId, location };
	}
}
