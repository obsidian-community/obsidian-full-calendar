import { assert } from "chai";
import { App } from "obsidian";
// import { Calendar } from "src/calendars/Calendar";
// import { OFCEvent } from "src/types";
// import EventCache from "./EventCache";

// jest.mock("obsidian");

// TODO: Write a mock Calendar for cache tests.

// class TestCalendar extends Calendar {
// 	private _id: string;
// 	events: OFCEvent[] = [];
// 	constructor(id: string) {
// 		super("#000000");
// 		this._id = id;
// 	}
// 	get type(): string {
// 		return "TEST-READONLY";
// 	}

// 	get id(): string {
// 		return this._id;
// 	}

// 	async getEvents(): Promise<OFCEvent[]> {
// 		return [...this.events];
// 	}
// }

describe("event cache tests", () => {
	// const cache = new EventCache();
	it("mocks app", () => {
		console.log(new App());
		// assert.equal(new App(), "hello world");
	});
});
