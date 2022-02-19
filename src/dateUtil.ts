import { DateTime, Duration } from "luxon";

export const parseTime = (time: string): Duration => {
	let parsed = DateTime.fromFormat(time, "h:mm a");
	if (parsed.invalidReason) {
		parsed = DateTime.fromFormat(time, "HH:mm");
	}
	return Duration.fromISOTime(
		parsed.toISOTime({
			includeOffset: false,
			includePrefix: false
		})
	);
};

export const normalizeTimeString = (time: string): string => {
	if (!time) time = "";
	return parseTime(time).toISOTime({
		suppressMilliseconds: true,
		includePrefix: false,
		suppressSeconds: true
	});
};

export const add = (date: DateTime, time: Duration): DateTime => {
	let hours = time.hours;
	let minutes = time.minutes;
	return date.set({ hour: hours, minute: minutes });
};

export const getTime = (date: Date): string =>
	DateTime.fromJSDate(date).toISOTime({
		suppressMilliseconds: true,
		includeOffset: false,
		suppressSeconds: true
	});

export const getDate = (date: Date): string =>
	DateTime.fromJSDate(date).toISODate();
