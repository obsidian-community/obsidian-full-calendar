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

	getBy(key: T): string[] {
		const related = this.related.get(key.id);
		if (!related) {
			return [];
		}
		return [...related.values()];
	}

	get numEntries(): number {
		return this.foreign.size;
	}

	get relatedCount(): number {
		return this.related.size;
	}
}

export default class EventStore {
	private store: Map<string, OFCEvent> = new Map();

	private calendarIndex = new OneToMany<Calendar, EventID>();
	private pathIndex = new OneToMany<Path, EventID>();

	// TODO: Add test for over-writing an event with the same ID.
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

	getEventsInFile(file: TFile): OFCEvent[] {
		return this.pathIndex
			.getBy(new Path(file))
			.flatMap((id) => this.store.get(id) || []);
	}

	getEventsInCalendar(calendar: Calendar): OFCEvent[] {
		return this.calendarIndex
			.getBy(calendar)
			.flatMap((id) => this.store.get(id) || []);
	}

	get fileCount() {
		return this.pathIndex.relatedCount;
	}

	get calendarCount() {
		return this.pathIndex.relatedCount;
	}

	get eventCount() {
		return this.store.size;
	}
}
