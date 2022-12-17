import { assert } from "chai";
import { Calendar, EventResponse } from "../calendars/Calendar";
import { CalendarInfo, OFCEvent } from "src/types";
import EventCache, {
	CalendarInitializerMap,
	OFCEventSource,
} from "./EventCache";

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

class TestCalendar extends Calendar {
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
				return new TestCalendar(info.color, info.id, info.events);
			})
		);
	it("populates a single event", async () => {
		const event = mockEvent();
		const cache = makeCache([event]);

		assert.isFalse(cache.initialized);
		cache.init();
		await cache.populate();
		assert.isTrue(cache.initialized);

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

		assert.isFalse(cache.initialized);
		cache.init();
		await cache.populate();
		assert.isTrue(cache.initialized);

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
		assert.isFalse(cache.initialized);
		cache.init();
		await cache.populate();
		assert.isTrue(cache.initialized);

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
