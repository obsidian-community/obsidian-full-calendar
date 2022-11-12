import { DateTime, Duration } from "luxon";

export const parseTime = (time: string): Duration | null => {
	let parsed = DateTime.fromFormat(time, "h:mm a");
	if (parsed.invalidReason) {
		parsed = DateTime.fromFormat(time, "HH:mm");
	}

	if (parsed.invalidReason) {
		console.error(
			`FC: Error parsing time string '${time}': ${parsed.invalidReason}'`
		);
		return null;
	}

	return Duration.fromISOTime(
		parsed.toISOTime({
			includeOffset: false,
			includePrefix: false,
		})
	);
};

export const normalizeTimeString = (time: string): string | null => {
	const parsed = parseTime(time);
	if (!parsed) {
		return null;
	}
	return parsed.toISOTime({
		suppressMilliseconds: true,
		includePrefix: false,
		suppressSeconds: true,
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
		suppressSeconds: true,
	});

export const getDate = (date: Date): string =>
	DateTime.fromJSDate(date).toISODate();

export const combineDateTimeStrings = (
	date: string,
	time: string
): string | null => {
	const parsedDate = DateTime.fromISO(date);
	if (parsedDate.invalidReason) {
		console.error(
			`FC: Error parsing time string '${date}': ${parsedDate.invalidReason}`
		);
		return null;
	}

	const parsedTime = parseTime(time);
	if (!parsedTime) {
		return null;
	}

	return add(parsedDate, parsedTime).toISO();
};
