import { TFile } from "obsidian";
import { Calendar } from "../calendars/Calendar";
import EventStore from "./EventStore";
import { EventLocation, OFCEvent } from "../types";

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

			expect(store.getEventsInCalendar(calendar)).toEqual([
				{ event, id, location: pathLoc(location) },
			]);
			expect(store.getEventsInFile(location.file)).toEqual([
				{ event, id, location: pathLoc(location) },
			]);
			expect(store.eventCount).toBe(1);
		});

		it(`throws when trying to overwrite an ID entry`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);
			const id = mockId();
			const event = mockEvent();

			store.add({ calendar, location, id, event });

			expect(() =>
				store.add({ calendar, location, id, event })
			).toThrow();
			const calendar2 = mockCalendar();
			const event2 = mockEvent();
			const location2 = mockLocation(withLineNumbers);
			expect(() =>
				store.add({ calendar: calendar2, location, id, event })
			).toThrow();
			expect(() =>
				store.add({ calendar, location: location2, id, event })
			).toThrow();
			expect(() =>
				store.add({ calendar, location, id, event: event2 })
			).toThrow();
		});

		it(`throws when trying to overwrite an ID entry`, () => {
			const calendar = mockCalendar();
			const location = mockLocation(withLineNumbers);
			const id = mockId();
			const event = mockEvent();
			const event2 = mockEvent();

			store.add({ calendar, location, id, event });
			expect(store.eventCount).toBe(1);
			expect(store.getEventById(id)).toEqual(event);
			store.delete(id);
			expect(store.eventCount).toBe(0);
			store.add({ calendar, location, id, event: event2 });
			expect(store.eventCount).toBe(1);
			expect(store.getEventById(id)).toEqual(event2);
		});

		it(`stores one event without a file`, () => {
			const calendar = mockCalendar();
			const event = mockEvent();
			const id = mockId();

			store.add({ calendar, location: null, id, event });

			expect(store.getEventsInCalendar(calendar)).toEqual([
				{ event, id, location: null },
			]);
			expect(0).toBe(store.fileCount);
		});

		it(`gets events in new calendar`, () => {
			const calendar = mockCalendar();
			expect(store.getEventsInCalendar(calendar)).toEqual([]);
		});

		it(`gets events in new file`, () => {
			const calendar = mockFile();
			expect(store.getEventsInFile(calendar)).toEqual([]);
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

			expect(store.eventCount).toBe(2);
			expect(store.fileCount).toBe(1);
			expect(store.calendarCount).toBe(1);

			expect(store.getEventsInCalendar(calendar)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location) },
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			expect(store.getEventsInFile(location.file)).toEqual([
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

			expect(store.eventCount).toBe(2);
			expect(store.fileCount).toBe(1);
			expect(store.calendarCount).toBe(1);

			expect(store.getEventsInCalendar(calendar)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location) },
				{ event: event2, id: id2, location: null },
			]);
			expect(store.getEventsInFile(location.file)).toEqual([
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

			expect(store.eventCount).toBe(2);
			expect(store.fileCount).toBe(2);
			expect(store.calendarCount).toBe(2);

			expect(store.getEventsInCalendar(calendar1)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			expect(store.getEventsInFile(location1.file)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);

			expect(store.getEventsInCalendar(calendar2)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			expect(store.getEventsInFile(location2.file)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
		});

		it(`stores and deletes one event`, () => {
			const calendar = mockCalendar();
			const event = mockEvent();
			const id = mockId();
			const location = mockLocation(withLineNumbers);

			store.add({ calendar, location, id, event });

			expect(store.getEventsInCalendar(calendar)).toEqual([
				{ event, id, location: pathLoc(location) },
			]);
			expect(store.getEventsInFile(location.file)).toEqual([
				{ event, id, location: pathLoc(location) },
			]);
			expect(store.eventCount).toBe(1);

			const result = store.delete(id);
			expect(result).toEqual(event);

			expect(store.getEventsInCalendar(calendar)).toEqual([]);
			expect(store.getEventsInFile(location.file)).toEqual([]);
			expect(store.eventCount).toBe(0);
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

			expect(store.eventCount).toBe(3);
			expect(store.fileCount).toBe(3);
			expect(store.calendarCount).toBe(2);

			expect(store.getEventsInCalendar(calendar1)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			expect(store.getEventsInFile(location1.file)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);

			// TODO: There appears to be a race condition or some other kind of nondeterminism here.
			// When lineNumbers=true, id13/file12 sometime has a lineNumber of undefined rather than 0.
			// Try to run this test a bunch and figure out what the issue is.
			expect(store.getEventsInCalendar(calendar2)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);
			expect(store.getEventsInFile(location2.file)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);

			expect(store.getEventsInFile(location3.file)).toEqual([
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			expect(toObject(store.eventsByCalendar)).toEqual({
				[calendar1.id]: [
					{ event: event1, id: id1, location: pathLoc(location1) },
				],
				[calendar2.id]: [
					{ event: event2, id: id2, location: pathLoc(location2) },
					{ event: event3, id: id3, location: pathLoc(location3) },
				],
			});

			expect(store.getCalendarIdForEventId(id1)).toBe(calendar1.id);
			expect(store.getCalendarIdForEventId(id2)).toBe(calendar2.id);
			expect(store.getCalendarIdForEventId(id3)).toBe(calendar2.id);
			expect(
				store.getEventsInFileAndCalendar(location2.file, calendar2)
			).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
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

			expect(store.eventCount).toBe(3);
			expect(store.fileCount).toBe(3);
			expect(store.calendarCount).toBe(2);

			expect(store.getEventsInCalendar(calendar1)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			expect(store.getEventsInCalendar(calendar2)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			expect(store.getEventsInFile(location1.file)).toEqual([
				{ event: event1, id: id1, location: pathLoc(location1) },
			]);
			expect(store.getEventsInFile(location2.file)).toEqual([
				{ event: event2, id: id2, location: pathLoc(location2) },
			]);
			expect(store.getEventsInFile(location3.file)).toEqual([
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			store.delete(id2);

			expect(store.eventCount).toBe(2);
			expect(store.fileCount).toBe(2);
			expect(store.calendarCount).toBe(2);
			store.delete(id1);
			expect(store.eventCount).toBe(1);
			expect(store.fileCount).toBe(1);
			expect(store.calendarCount).toBe(1);

			expect(store.getEventsInCalendar(calendar1)).toEqual([]);
			expect(store.getEventsInCalendar(calendar2)).toEqual([
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			expect(store.getEventsInFile(location1.file)).toEqual([]);
			expect(store.getEventsInFile(location2.file)).toEqual([]);
			expect(store.getEventsInFile(location3.file)).toEqual([
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
			expect(store.eventCount).toBe(2);
			expect(store.fileCount).toBe(2);
			expect(store.calendarCount).toBe(2);

			expect(store.getEventsInCalendar(calendar1)).toEqual([
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			expect(store.getEventsInCalendar(calendar2)).toEqual([
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			expect(store.getEventsInFile(location1.file)).toEqual([
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			expect(store.getEventsInFile(location2.file)).toEqual([]);
			expect(store.getEventsInFile(location3.file)).toEqual([
				{ event: event3, id: id3, location: pathLoc(location3) },
			]);

			store.delete(id3);
			expect(store.eventCount).toBe(1);
			expect(store.fileCount).toBe(1);
			expect(store.calendarCount).toBe(1);

			expect(store.getEventsInCalendar(calendar1)).toEqual([
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			expect(store.getEventsInCalendar(calendar2)).toEqual([]);

			expect(store.getEventsInFile(location1.file)).toEqual([
				{ event: event4, id: id4, location: pathLoc(location4) },
			]);
			expect(store.getEventsInFile(location2.file)).toEqual([]);
			expect(store.getEventsInFile(location3.file)).toEqual([]);

			store.delete(id4);
			expect(store.eventCount).toBe(0);
			expect(store.fileCount).toBe(0);
			expect(store.calendarCount).toBe(0);
		});
	}
);
