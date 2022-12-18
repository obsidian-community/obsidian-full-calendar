import { TFile } from "obsidian";
import { Calendar } from "../calendars/Calendar";
import EventStore from "./EventStore";
import { EventLocation, OFCEvent } from "../types";
import { assert } from "chai";

const withCounter = <T>(f: (x: string) => T, label?: string) => {
	const counter = () => {
		let count = 0;
		return () => (label || "") + count++;
	};
	const c = counter();
	return () => f(c());
};

const mockFile = withCounter((path) => ({ path } as TFile), "file");

const mockCalendar = withCounter(
	(id): Calendar => ({ id } as Calendar),
	"calendar"
);

const mockEvent = withCounter(
	(title): OFCEvent => ({ title } as OFCEvent),
	"event"
);

const mockLocation = (withLine = false) => ({
	file: mockFile(),
	lineNumber: withLine ? Math.floor(Math.random() * 100) : undefined,
});

const mockId = withCounter((x) => x, "id");

const toObject = <V>(m: Map<string, V>) => {
	const result: { [k: string]: V } = {};
	for (const [k, v] of m.entries()) {
		result[k] = v;
	}
	return result;
};

const pathLoc = ({ file, lineNumber }: EventLocation) => ({
	path: file.path,
	lineNumber,
});

describe.each([true, false])(
	"EventStore tests with lineNumbers=%p",
	(withLineNumbers) => {
		let store = new EventStore();
		beforeEach(() => {
			store.clear();
		});

		it(`stores one event`, () => {
			const calendar = mockCalendar();
			const event = mockEvent();
			const id = mockId();
			const location = mockLocation(withLineNumbers);

			store.add({ calendar, location, id, event });

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
				{ event, id, location: pathLoc(location) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location.file), [
				{ event, id, location: pathLoc(location) },
			]);
			assert.equal(store.eventCount, 1);
		});

		it(`throws when trying to overwrite an ID entry`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);
			const id = mockId();
			const event = mockEvent();

			store.add({ calendar, location, id, event });

			assert.throws(() => store.add({ calendar, location, id, event }));
			const calendar2 = mockCalendar();
			const event2 = mockEvent();
			const location2 = mockLocation(withLineNumbers);
			assert.throws(() =>
				store.add({ calendar: calendar2, location, id, event })
			);
			assert.throws(() =>
				store.add({ calendar, location: location2, id, event })
			);
			assert.throws(() =>
				store.add({ calendar, location, id, event: event2 })
			);
		});

		it(`throws when trying to overwrite an ID entry`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);
			const id = mockId();
			const event = mockEvent();
			const event2 = mockEvent();

			store.add({ calendar, location, id, event });
			assert.equal(store.eventCount, 1);
			assert.deepStrictEqual(store.getEventById(id), event);
			store.delete(id);
			assert.equal(store.eventCount, 0);
			store.add({ calendar, location, id, event: event2 });
			assert.equal(store.eventCount, 1);
			assert.deepStrictEqual(store.getEventById(id), event2);
		});

		it(`stores one event without a file`, () => {
			const calendar = mockCalendar();
			const event = mockEvent();
			const id = mockId();

			store.add({ calendar, location: null, id, event });

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
				{ event, id, location: null },
			]);
			assert.equal(0, store.fileCount);
		});

		it(`gets events in new calendar`, () => {
			const calendar = mockCalendar();
			assert.deepStrictEqual(store.getEventsInCalendar(calendar), []);
		});

		it(`gets events in new file`, () => {
			const calendar = mockFile();
			assert.deepStrictEqual(store.getEventsInFile(calendar), []);
		});

		it(`stores two events in the same file`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);
			const location2 = { file: location.file, lineNumber: 102 };

			const event1 = mockEvent();
			const id1 = mockId();

			const event2 = mockEvent();
			const id2 = mockId();

			store.add({ calendar, location, id: id1, event: event1 });
			store.add({
				calendar,
				location: location2,
				id: id2,
				event: event2,
			});

			assert.equal(store.eventCount, 2);
			assert.equal(store.fileCount, 1);
			assert.equal(store.calendarCount, 1);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
				{ event: event1, id: id1, location: pathLoc(location) },
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location.file), [
				{ event: event1, id: id1, location: pathLoc(location) },
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
		});

		it(`stores two events, only one with a file`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);

			const event1 = mockEvent();
			const id1 = mockId();

			const event2 = mockEvent();
			const id2 = mockId();

			store.add({ calendar, location, id: id1, event: event1 });
			store.add({ calendar, location: null, id: id2, event: event2 });

			assert.equal(store.eventCount, 2);
			assert.equal(store.fileCount, 1);
			assert.equal(store.calendarCount, 1);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
				{ event: event1, id: id1, location: pathLoc(location) },
				{ event: event2, id: id2, location: null },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location.file), [
				{ event: event1, id: id1, location: pathLoc(location) },
			]);
		});

		it(`stores two events in different calendars and files`, () => {
			const calendar1 = mockCalendar();
			const calendar2 = mockCalendar();
			// const file1 = mockFile();
			// const file2 = mockFile();
			const location1 = mockLocation(withLineNumbers);
			const location2 = mockLocation(withLineNumbers);

			const event1 = mockEvent();
			const id1 = mockId();

			const event2 = mockEvent();
			const id2 = mockId();

			store.add({
				calendar: calendar1,
				location: location1,
				id: id1,
				event: event1,
			});
			store.add({
				calendar: calendar2,
				location: location2,
				id: id2,
				event: event2,
			});

			assert.equal(store.eventCount, 2);
			assert.equal(store.fileCount, 2);
			assert.equal(store.calendarCount, 2);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location1.file), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), [
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
		});

		it(`stores and deletes one event`, () => {
			const calendar = mockCalendar();
			const event = mockEvent();
			const id = mockId();
			const location = mockLocation(withLineNumbers);

			store.add({ calendar, location, id, event });

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), [
				{ event, id, location: pathLoc(location) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location.file), [
				{ event, id, location: pathLoc(location) },
			]);
			assert.equal(store.eventCount, 1);

			const result = store.delete(id);
			assert.deepStrictEqual(result, event);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar), []);
			assert.deepStrictEqual(store.getEventsInFile(location.file), []);
			assert.equal(store.eventCount, 0);
		});

		it(`stores many events in different calendars and files`, () => {
			const calendar1 = mockCalendar();
			const calendar2 = mockCalendar();
			const location1 = mockLocation(withLineNumbers);
			const location2 = mockLocation(withLineNumbers);
			const location3 = mockLocation(withLineNumbers);

			const event1 = mockEvent();
			const id1 = mockId();

			const event2 = mockEvent();
			const id2 = mockId();

			const event3 = mockEvent();
			const id3 = mockId();

			store.add({
				calendar: calendar1,
				location: location1,
				id: id1,
				event: event1,
			});
			store.add({
				calendar: calendar2,
				location: location2,
				id: id2,
				event: event2,
			});
			store.add({
				calendar: calendar2,
				location: location3,
				id: id3,
				event: event3,
			});

			assert.equal(store.eventCount, 3);
			assert.equal(store.fileCount, 3);
			assert.equal(store.calendarCount, 2);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location1.file), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);

			// TODO: There appears to be a race condition or some other kind of nondeterminism here.
			// When lineNumbers=true, id13/file12 sometime has a lineNumber of undefined rather than 0.
			// Try to run this test a bunch and figure out what the issue is.
			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [
				{ event: event2, id: id2, location: pathLoc(location2) },
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), [
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);

			assert.deepStrictEqual(store.getEventsInFile(location3.file), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			assert.deepStrictEqual(toObject(store.eventsByCalendar), {
				[calendar1.id]: [
					{ event: event1, id: id1, location: pathLoc(location1) },
				],
				[calendar2.id]: [
					{ event: event2, id: id2, location: pathLoc(location2) },
					{ event: event3, id: id3, location: pathLoc(location3) },
				],
			});

			assert.equal(store.getCalendarIdForEventId(id1), calendar1.id);
			assert.equal(store.getCalendarIdForEventId(id2), calendar2.id);
			assert.equal(store.getCalendarIdForEventId(id3), calendar2.id);
			assert.deepStrictEqual(
				store.getEventsInFileAndCalendar(location2.file, calendar2),
				[{ event: event2, id: id2, location: pathLoc(location2) }]
			);
		});

		it(`stores then deletes many events`, () => {
			const calendar1 = mockCalendar();
			const calendar2 = mockCalendar();

			const location1 = mockLocation(withLineNumbers);
			const location2 = mockLocation(withLineNumbers);
			const location3 = mockLocation(withLineNumbers);

			const event1 = mockEvent();
			const id1 = mockId();

			const event2 = mockEvent();
			const id2 = mockId();

			const event3 = mockEvent();
			const id3 = mockId();

			store.add({
				calendar: calendar1,
				location: location1,
				id: id1,
				event: event1,
			});
			store.add({
				calendar: calendar2,
				location: location2,
				id: id2,
				event: event2,
			});
			store.add({
				calendar: calendar2,
				location: location3,
				id: id3,
				event: event3,
			});

			assert.equal(store.eventCount, 3);
			assert.equal(store.fileCount, 3);
			assert.equal(store.calendarCount, 2);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [
				{ event: event2, id: id2, location: pathLoc(location2) },
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			assert.deepStrictEqual(store.getEventsInFile(location1.file), [
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), [
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location3.file), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			store.delete(id2);

			assert.equal(store.eventCount, 2);
			assert.equal(store.fileCount, 2);
			assert.equal(store.calendarCount, 2);
			store.delete(id1);
			assert.equal(store.eventCount, 1);
			assert.equal(store.fileCount, 1);
			assert.equal(store.calendarCount, 1);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), []);
			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			assert.deepStrictEqual(store.getEventsInFile(location1.file), []);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), []);
			assert.deepStrictEqual(store.getEventsInFile(location3.file), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			const id4 = mockId();
			const event4 = mockEvent();
			const location4 = { file: location1.file, lineNumber: 30 };
			store.add({
				calendar: calendar1,
				location: location4,
				id: id4,
				event: event4,
			});
			assert.equal(store.eventCount, 2);
			assert.equal(store.fileCount, 2);
			assert.equal(store.calendarCount, 2);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			assert.deepStrictEqual(store.getEventsInFile(location1.file), [
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), []);
			assert.deepStrictEqual(store.getEventsInFile(location3.file), [
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			store.delete(id3);
			assert.equal(store.eventCount, 1);
			assert.equal(store.fileCount, 1);
			assert.equal(store.calendarCount, 1);

			assert.deepStrictEqual(store.getEventsInCalendar(calendar1), [
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			assert.deepStrictEqual(store.getEventsInCalendar(calendar2), []);

			assert.deepStrictEqual(store.getEventsInFile(location1.file), [
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			assert.deepStrictEqual(store.getEventsInFile(location2.file), []);
			assert.deepStrictEqual(store.getEventsInFile(location3.file), []);

			store.delete(id4);
			assert.equal(store.eventCount, 0);
			assert.equal(store.fileCount, 0);
			assert.equal(store.calendarCount, 0);
		});
	}
);
