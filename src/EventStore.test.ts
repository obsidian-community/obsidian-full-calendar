import { TFile } from "obsidian";
import { Calendar } from "./calendars/Calendar";
import EventStore from "./EventStore";
import { OFCEvent } from "./types";
import { assert } from "chai";

const withCounter = <T>(f: (x: string) => T) => {
	const counter = () => {
		let count = 0;
		return () => count++ + "";
	};
	const c = counter();
	return () => f(c());
};

const mockFile = withCounter((path) => ({ path } as TFile));

const mockCalendar = withCounter((id): Calendar => ({ id } as Calendar));

const mockEvent = withCounter((title): OFCEvent => ({ title } as OFCEvent));

const mockId = withCounter((x) => x);

describe("EventStore tests", () => {
	let store = new EventStore();
	beforeEach(() => {
		store = new EventStore();
	});

	it("stores one event", () => {
		const calendar = mockCalendar();
		const event = mockEvent();
		const file = mockFile();
		const id = mockId();

		store.add({ calendar, file, id, event });

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), [event]);
		assert.deepStrictEqual(store.getEventsInFile(file), [event]);
		assert.equal(store.eventCount, 1);
	});

	it("stores one event without a file", () => {
		const calendar = mockCalendar();
		const event = mockEvent();

		store.add({ calendar, file: null, id: "event id", event });

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), [event]);
		assert.equal(0, store.fileCount);
	});

	it("gets events in new calendar", () => {
		const calendar = mockCalendar();
		assert.deepStrictEqual(store.getEventsInCalendar(calendar), []);
	});

	it("gets events in new file", () => {
		const calendar = mockFile();
		assert.deepStrictEqual(store.getEventsInFile(calendar), []);
	});

	it("stores two events in the same file", () => {
		const calendar = mockCalendar();
		const file = mockFile();

		const event1 = mockEvent();
		const id1 = mockId();

		const event2 = mockEvent();
		const id2 = mockId();

		store.add({ calendar, file: file, id: id1, event: event1 });
		store.add({ calendar, file: file, id: id2, event: event2 });

		assert.equal(store.eventCount, 2);
		assert.equal(store.fileCount, 1);
		assert.equal(store.calendarCount, 1);

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
			event1,
			event2,
		]);
		assert.deepStrictEqual(store.getEventsInFile(file), [event1, event2]);
	});

	it("stores two events, only one with a file", () => {
		const calendar = mockCalendar();
		const file = mockFile();

		const event1 = mockEvent();
		const id1 = mockId();

		const event2 = mockEvent();
		const id2 = mockId();

		store.add({ calendar, file: file, id: id1, event: event1 });
		store.add({ calendar, file: null, id: id2, event: event2 });

		assert.equal(store.eventCount, 2);
		assert.equal(store.fileCount, 1);
		assert.equal(store.calendarCount, 1);

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
			event1,
			event2,
		]);
		assert.deepStrictEqual(store.getEventsInFile(file), [event1]);
	});

	it("stores two events in different calendars and files", () => {
		const calendar1 = mockCalendar();
		const calendar2 = mockCalendar();
		const file1 = mockFile();
		const file2 = mockFile();

		const event1 = mockEvent();
		const id1 = mockId();

		const event2 = mockEvent();
		const id2 = mockId();

		store.add({ calendar: calendar1, file: file1, id: id1, event: event1 });
		store.add({ calendar: calendar2, file: file2, id: id2, event: event2 });

		assert.equal(store.eventCount, 2);
		assert.equal(store.fileCount, 2);
		assert.equal(store.calendarCount, 2);

		assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [event1]);
		assert.deepStrictEqual(store.getEventsInFile(file1), [event1]);

		assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [event2]);
		assert.deepStrictEqual(store.getEventsInFile(file2), [event2]);
	});

	it("stores and deletes one event", () => {
		const calendar = mockCalendar();
		const event = mockEvent();
		const file = mockFile();
		const id = mockId();

		store.add({ calendar, file, id, event });

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), [event]);
		assert.deepStrictEqual(store.getEventsInFile(file), [event]);
		assert.equal(store.eventCount, 1);

		const result = store.delete(id);
		assert.deepStrictEqual(result, event);

		assert.deepStrictEqual(store.getEventsInCalendar(calendar), []);
		assert.deepStrictEqual(store.getEventsInFile(file), []);
		assert.equal(store.eventCount, 0);
	});
});
