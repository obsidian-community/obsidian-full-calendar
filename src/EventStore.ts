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
	private foreign: Record<string, string> = {};
	private related: Record<string, Set<string>> = {};

	add(one: T, many: FK) {
		this.foreign[many.id] = one.id;
		if (!(one in this.related)) {
			this.related[one.id] = new Set();
		}
		this.related[one.id].add(many.id);
	}

	delete(many: FK) {
		if (!(many.id in this.foreign)) {
			return;
		}
		const oneId = this.foreign[many.id];
		delete this.foreign[many.id];
		this.related[oneId].delete(many.id);
	}

	getBy(key: T): string[] {
		return [...this.related[key.id].values()];
	}

	get numEntries(): number {
		return Object.keys(this.foreign).length;
	}

	get relatedCount(): number {
		return Object.keys(this.related).length;
	}
}

export default class EventStore {
	private store: Record<string, OFCEvent> = {};

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
		this.store[id] = event;

		this.calendarIndex.add(calendar, new EventID(id));

		if (file) {
			this.pathIndex.add(new Path(file), new EventID(id));
		}
	}

	delete(id: string): OFCEvent | null {
		if (!(id in this.store)) {
			return null;
		}

		this.calendarIndex.delete(new EventID(id));
		this.pathIndex.delete(new EventID(id));
		const event = this.store[id];
		delete this.store[id];
		return event;
	}

	getEventById(id: string): OFCEvent | null {
		return this.store[id] || null;
	}

	getEventsInFile(file: TFile): OFCEvent[] {
		return this.pathIndex.getBy(new Path(file)).map((id) => this.store[id]);
	}

	getEventsInCalendar(calendar: Calendar): OFCEvent[] {
		return this.calendarIndex.getBy(calendar).map((id) => this.store[id]);
	}

	get fileCount() {
		return this.pathIndex.relatedCount;
	}

	get calendarCount() {
		return this.pathIndex.relatedCount;
	}

	get eventCount() {
		return Object.keys(this.store).length;
	}
}
