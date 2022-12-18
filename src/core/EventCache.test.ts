import { assert } from "chai";
import { Calendar, EventResponse } from "../calendars/Calendar";
import {
	EditableCalendar,
	EditableEventResponse,
} from "../calendars/EditableCalendar";
import { CalendarInfo, EventLocation, OFCEvent } from "src/types";
import EventCache, {
	CacheEntry,
	CalendarInitializerMap,
	OFCEventSource,
} from "./EventCache";
import { TFile } from "obsidian";
import { EventPathLocation } from "./EventStore";
import { createCipheriv } from "crypto";

const withCounter = <T>(f: (x: string) => T, label?: string) => {
	const counter = () => {
		let count = 0;
		return () => (label || "") + count++;
	};
	const c = counter();
	return () => f(c());
};

const mockEvent = withCounter(
	(title): OFCEvent => ({ title } as OFCEvent),
	"event"
);

class TestReadonlyCalendar extends Calendar {
	private _id: string;
	events: OFCEvent[] = [];
	constructor(color: string, id: string, events: OFCEvent[]) {
		super(color);
		this._id = id;
		this.events = events;
	}
	get type(): string {
		return "TEST-READONLY";
	}

	get id(): string {
		return this._id;
	}

	async getEvents(): Promise<EventResponse[]> {
		return this.events.map((event) => [event, null]);
	}
}

// For tests, we only want test calendars to
const initializerMap = (
	cb: (info: CalendarInfo) => Calendar | null
): CalendarInitializerMap => ({
	FOR_TEST_ONLY: cb,
	local: () => null,
	dailynote: () => null,
	gcal: () => null,
	ical: () => null,
	icloud: () => null,
	caldav: () => null,
});

const extractEvents = (source: OFCEventSource): OFCEvent[] =>
	source.events.map(({ event }) => event);

async function assertFailed(func: () => Promise<any>, message: RegExp) {
	try {
		await func();
	} catch (e) {
		if (e instanceof Error) {
			assert.match(e.message, message);
		} else {
			assert(true);
		}
		return;
	}
	assert(false);
}

describe("event cache with readonly calendar", () => {
	const makeCache = (events: OFCEvent[]) =>
		new EventCache(
			[{ type: "FOR_TEST_ONLY", color: "#000000", id: "test", events }],
			initializerMap((info) => {
				if (info.type !== "FOR_TEST_ONLY") {
					return null;
				}
				return new TestReadonlyCalendar(
					info.color,
					info.id,
					info.events || []
				);
			})
		);
	it("populates a single event", async () => {
		const event = mockEvent();
		const cache = makeCache([event]);

		assert.isFalse(cache.initialized);
		await cache.populate();
		assert.isTrue(cache.initialized);

		const calendar = cache.getCalendarById("test");
		assert.exists(calendar);
		assert.equal(calendar?.id, "test");
		const sources = cache.getAllEvents();
		assert.equal(sources.length, 1);
		assert.deepStrictEqual(extractEvents(sources[0]), [event]);
		assert.deepStrictEqual(sources[0].color, "#000000");
		assert.isFalse(sources[0].editable);
	});

	it("populates multiple events", async () => {
		const event1 = mockEvent();
		const event2 = mockEvent();
		const event3 = mockEvent();
		const cache = makeCache([event1, event2, event3]);

		await cache.populate();

		const sources = cache.getAllEvents();
		assert.equal(sources.length, 1);
		assert.deepStrictEqual(extractEvents(sources[0]), [
			event1,
			event2,
			event3,
		]);
		assert.deepStrictEqual(sources[0].color, "#000000");
		assert.isFalse(sources[0].editable);
	});

	it("properly sorts events into separate calendars", async () => {
		const cache = makeCache([]);
		const events1 = [mockEvent()];
		const events2 = [mockEvent(), mockEvent()];
		cache.reset([
			{
				type: "FOR_TEST_ONLY",
				id: "cal1",
				color: "red",
				events: events1,
			},
			{
				type: "FOR_TEST_ONLY",
				id: "cal2",
				color: "blue",
				events: events2,
			},
		]);
		await cache.populate();

		const sources = cache.getAllEvents();
		assert.equal(sources.length, 2);
		assert.deepStrictEqual(extractEvents(sources[0]), events1);
		assert.deepStrictEqual(sources[0].color, "red");
		assert.isFalse(sources[0].editable);
		assert.deepStrictEqual(extractEvents(sources[1]), events2);
		assert.deepStrictEqual(sources[1].color, "blue");
		assert.isFalse(sources[1].editable);
	});

	it.each([
		[
			"addEvent",
			async (cache: EventCache, id: string) =>
				await cache.addEvent("test", mockEvent()),
		],
		[
			"deleteEvent",
			async (cache: EventCache, id: string) =>
				await cache.deleteEvent(id),
		],
		[
			"modifyEvent",
			async (cache: EventCache, id: string) =>
				await cache.modifyEvent(id, mockEvent()),
		],
	])("does not allow editing via %p", async (_, f) => {
		const event = mockEvent();
		const cache = makeCache([event]);
		cache.init();
		await cache.populate();

		const sources = cache.getAllEvents();
		assert.equal(sources.length, 1);
		const eventId = sources[0].events[0].id;

		await assertFailed(
			async () => await f(cache, eventId),
			/non-editable calendar/
		);
	});
});

class TestEditable extends EditableCalendar {
	private _directory: string;
	events: EditableEventResponse[];
	shouldContainPath = true;
	constructor(
		color: string,
		directory: string,
		events: EditableEventResponse[]
	) {
		super(color);
		this._directory = directory;
		this.events = events;
	}
	get directory(): string {
		return this._directory;
	}

	containsPath(path: string): boolean {
		return this.shouldContainPath;
	}

	getEvents = jest.fn(async () => this.events);
	getEventsInFile = jest.fn();

	createEvent = jest.fn();

	deleteEvent = jest.fn();
	moveEvent = jest.fn();
	updateEvent = jest.fn();

	get type(): string {
		return "TEST_EDITABLE_EVENT";
	}
	get id(): string {
		return this.directory;
	}
}

const mockFile = withCounter((path) => ({ path } as TFile), "file");
const mockLocation = (withLine = false) => ({
	file: mockFile(),
	lineNumber: withLine ? Math.floor(Math.random() * 100) : undefined,
});

const mockEventResponse = (): EditableEventResponse => [
	mockEvent(),
	mockLocation(),
];

describe("editable calendars", () => {
	const makeCache = (events: EditableEventResponse[]) =>
		new EventCache(
			[{ type: "FOR_TEST_ONLY", id: "test", events: [], color: "black" }],
			initializerMap((info) => {
				if (info.type !== "FOR_TEST_ONLY") {
					return null;
				}
				return new TestEditable(info.color, info.id, events);
			})
		);

	const getCalendar = (cache: EventCache, id: string) => {
		const calendar = cache.getCalendarById(id);
		assert.exists(calendar);
		assert.instanceOf(calendar, TestEditable);
		return calendar as TestEditable;
	};

	it("populates a single event", async () => {
		const e1 = mockEventResponse();
		const cache = makeCache([e1]);

		await cache.populate();

		const calendar = getCalendar(cache, "test");

		const sources = cache.getAllEvents();

		assert.equal((calendar as TestEditable).getEvents.mock.calls.length, 1);
		assert.equal(sources.length, 1);

		assert.deepStrictEqual(extractEvents(sources[0]), [e1[0]]);
		assert.deepStrictEqual(sources[0].color, "black");
		assert.isTrue(sources[0].editable);
	});

	describe("add events", () => {
		it("empty cache", async () => {
			const cache = makeCache([]);

			await cache.populate();

			const calendar = getCalendar(cache, "test");

			const event = mockEvent();
			const loc = mockLocation();
			calendar.createEvent.mockReturnValueOnce(
				new Promise((resolve) => resolve(loc))
			);
			assert.isTrue(await cache.addEvent("test", event));
			assert.equal(calendar.createEvent.mock.calls.length, 1);
			assert.deepStrictEqual(calendar.createEvent.mock.calls[0], [event]);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);
		});

		it("in the same file", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			const calendar = getCalendar(cache, "test");

			const event2 = mockEvent();
			const loc = { file: event[1].file, lineNumber: 102 };
			calendar.createEvent.mockReturnValueOnce(
				new Promise((resolve) => resolve(loc))
			);
			assert.isTrue(await cache.addEvent("test", event2));
			assert.equal(calendar.createEvent.mock.calls.length, 1);
			assert.deepStrictEqual(calendar.createEvent.mock.calls[0], [
				event2,
			]);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 2);
		});

		it("in a different file", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			const event2 = mockEvent();
			const loc = mockLocation();

			const calendar = getCalendar(cache, "test");
			calendar.createEvent.mockReturnValueOnce(
				new Promise((resolve) => resolve(loc))
			);
			assert.isTrue(await cache.addEvent("test", event2));
			assert.equal(calendar.createEvent.mock.calls.length, 1);
			assert.deepStrictEqual(calendar.createEvent.mock.calls[0], [
				event2,
			]);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 2);
			assert.equal(cache._storeForTest.eventCount, 2);
		});

		it("adding many events", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			const calendar = getCalendar(cache, "test");

			calendar.createEvent
				.mockReturnValueOnce(
					new Promise((resolve) => resolve(mockLocation()))
				)
				.mockReturnValueOnce(
					new Promise((resolve) => resolve(mockLocation()))
				)
				.mockReturnValueOnce(
					new Promise((resolve) => resolve(mockLocation()))
				);

			assert.isTrue(await cache.addEvent("test", mockEvent()));
			assert.isTrue(await cache.addEvent("test", mockEvent()));
			assert.isTrue(await cache.addEvent("test", mockEvent()));

			assert.equal(calendar.createEvent.mock.calls.length, 3);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 4);
			assert.equal(cache._storeForTest.eventCount, 4);
		});
	});
	const pathResult = (loc: EventLocation): EventPathLocation => ({
		path: loc.file.path,
		lineNumber: loc.lineNumber,
	});
	describe("delete events", () => {
		it("delete one", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);

			const sources = cache.getAllEvents();
			assert.equal(sources.length, 1);
			const id = sources[0].events[0].id;

			await cache.deleteEvent(id);

			const calendar = getCalendar(cache, "test");
			assert.equal(calendar.deleteEvent.mock.calls.length, 1);
			assert.deepStrictEqual(calendar.deleteEvent.mock.calls[0], [
				pathResult(event[1]),
			]);

			assert.equal(cache._storeForTest.calendarCount, 0);
			assert.equal(cache._storeForTest.fileCount, 0);
			assert.equal(cache._storeForTest.eventCount, 0);
		});

		it("delete non-existing event", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);

			assertFailed(
				() => cache.deleteEvent("unknown ID"),
				/not present in event store/
			);

			const calendar = getCalendar(cache, "test");
			assert.equal(calendar.deleteEvent.mock.calls.length, 0);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);
		});
	});

	describe("modify event", () => {
		const oldEvent = mockEventResponse();
		const newLoc = mockLocation();
		const newEvent = mockEvent();

		it.each([
			[
				newLoc,
				[
					{ file: oldEvent[1].file, numEvents: 0 },
					{ file: newLoc.file, numEvents: 1 },
				],
			],
			[
				{ file: oldEvent[1].file, lineNumber: newLoc.lineNumber },
				[
					{ file: oldEvent[1].file, numEvents: 1 },
					{ file: newLoc.file, numEvents: 0 },
				],
			],
		])(
			"modify existing event and move to another file",
			async (newLocation, fileDetails) => {
				const cache = makeCache([oldEvent]);

				await cache.populate();

				assert.equal(cache._storeForTest.calendarCount, 1);
				assert.equal(cache._storeForTest.fileCount, 1);
				assert.equal(cache._storeForTest.eventCount, 1);

				const sources = cache.getAllEvents();
				assert.equal(sources.length, 1);
				const id = sources[0].events[0].id;

				const calendar = getCalendar(cache, "test");
				calendar.updateEvent.mockReturnValueOnce(
					new Promise((resolve) => resolve(newLocation))
				);

				assert.equal(
					cache._storeForTest.getEventsInFile(oldEvent[1].file)
						.length,
					1
				);

				await cache.modifyEvent(id, newEvent);

				assert.equal(calendar.updateEvent.mock.calls.length, 1);
				assert.deepStrictEqual(calendar.updateEvent.mock.calls[0], [
					pathResult(oldEvent[1]),
					newEvent,
				]);

				assert.equal(cache._storeForTest.calendarCount, 1);
				assert.equal(cache._storeForTest.fileCount, 1);
				assert.equal(cache._storeForTest.eventCount, 1);

				assert.deepStrictEqual(
					cache._storeForTest.getEventById(id),
					newEvent
				);

				for (const { file, numEvents } of fileDetails) {
					assert.equal(
						cache._storeForTest.getEventsInFile(file).length,
						numEvents
					);
				}
			}
		);

		it("modify non-existing event", async () => {
			const event = mockEventResponse();
			const cache = makeCache([event]);

			await cache.populate();

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);

			assertFailed(
				() => cache.modifyEvent("unknown ID", mockEvent()),
				/not present in event store/
			);

			const sources = cache.getAllEvents();
			assert.equal(sources.length, 1);
			const id = sources[0].events[0].id;

			const calendar = getCalendar(cache, "test");
			assert.equal(calendar.updateEvent.mock.calls.length, 0);
			assert.deepStrictEqual(
				cache._storeForTest.getEventById(id),
				event[0]
			);

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);
		});
	});

	describe("filesystem update callback", () => {
		const callbackMock = jest.fn();
		const event = mockEventResponse();
		let cache: EventCache;
		beforeEach(() => {
			cache = makeCache([event]);
			cache.populate();
			callbackMock.mockClear();
			cache.on("update", callbackMock);
		});

		it("updates when there's a new file", async () => {
			const event2 = mockEventResponse();
			const calendar = getCalendar(cache, "test");

			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 1);
			assert.equal(cache._storeForTest.eventCount, 1);

			calendar.getEventsInFile.mockReturnValue(
				new Promise((resolve) => resolve([event2]))
			);

			await cache.fileUpdated(event2[1].file);

			assert.equal(cache._storeForTest.eventCount, 2);
			assert.equal(cache._storeForTest.calendarCount, 1);
			assert.equal(cache._storeForTest.fileCount, 2);

			assert.equal(callbackMock.mock.calls.length, 1);

			const callbackInvocation: {
				toRemove: string[];
				toAdd: CacheEntry[];
			} = callbackMock.mock.calls[0][0];
			assert.hasAllKeys(callbackInvocation, ["toRemove", "toAdd"]);
			assert.equal(callbackInvocation.toRemove.length, 0);
			assert.equal(callbackInvocation.toAdd.length, 1);
			assert.equal(callbackInvocation.toAdd[0].event, event2[0]);
		});
		it.todo("updates when events change");
		it.todo("doesn't update when events are the same");
		it.todo("updates when events are the same but locations are different");
	});

	describe("make sure cache is populated before doing anything", () => {});
});
