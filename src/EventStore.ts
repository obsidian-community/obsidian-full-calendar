import { TFile } from "obsidian";
import { Calendar } from "./calendars/Calendar";
import { OFCEvent } from "./types";

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

const mapRecord = <X, Y>(
	r: Record<string, X>,
	f: (x: X) => Y
): Record<string, Y> =>
	Object.fromEntries(Object.entries<X>(r).map(([k, v]) => [k, f(v)]));

type EventResult = { id: string; event: OFCEvent };

// Class that stores events by their ID as the primary key, with secondary "indexes" by calendar and file.
// You can look up events by what calendar they belong to, as well as what file their source lives in.
export default class EventStore {
	private store: Map<string, OFCEvent> = new Map();

	private calendarIndex = new OneToMany<Calendar, EventID>();
	private pathIndex = new OneToMany<Path, EventID>();

	clear() {
		this.store.clear();
		this.calendarIndex.clear();
		this.pathIndex.clear();
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
			result.push({ id, event });
		});
		return result;
	}

	add({
		calendar,
		file,
		id,
		event,
	}: {
		calendar: Calendar;
		file: TFile | null;
		id: string;
		event: OFCEvent;
	}) {
		if (this.store.has(id)) {
			throw new Error(
				"Event with given ID already exists in the EventStore."
			);
		}

		this.store.set(id, event);

		this.calendarIndex.add(calendar, new EventID(id));

		if (file) {
			this.pathIndex.add(new Path(file), new EventID(id));
		}
	}

	delete(id: string): OFCEvent | null {
		const event = this.store.get(id);
		if (!event) {
			return null;
		}

		this.calendarIndex.delete(new EventID(id));
		this.pathIndex.delete(new EventID(id));
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

	get eventsByCalendar(): Map<string, EventResult[]> {
		const result = new Map();
		for (const [k, vs] of this.calendarIndex.groupByRelated) {
			result.set(k, this.fetch(vs));
		}
		return result;
	}
}
