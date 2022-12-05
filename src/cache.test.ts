import Cache from "./cache";
import { CalendarInfo } from "./types";

const makeMockPlugin = (sources: CalendarInfo[]) => {
	settings: {
		calendarSources: sources;
	}
};
