import { DateTime, Duration } from "luxon";
import { Err, Ok, Result } from "./types";

export const parseTime = (time: string): Result<Duration> => {
	let parsed = DateTime.fromFormat(time, "h:mm a");
	if (parsed.invalidReason) {
		parsed = DateTime.fromFormat(time, "HH:mm");
	}
	if (parsed.invalidReason) {
		return Err(`Invalid time string ${time}: ${parsed.invalidReason}`);
	}
	return Ok(
		Duration.fromISOTime(
			parsed.toISOTime({
				includeOffset: false,
				includePrefix: false,
			})
		)
	);
};

export const normalizeTimeString = (time: string): Result<string> => {
	const parsed = parseTime(time);
	if (!parsed.ok) {
		return parsed;
	}
	return Ok(
		parsed.value.toISOTime({
			suppressMilliseconds: true,
			includePrefix: false,
			suppressSeconds: true,
		})
	);
};

export const add = (date: DateTime, time: Duration): DateTime => {
	let hours = time.hours;
	let minutes = time.minutes;
	return date.set({ hour: hours, minute: minutes });
};

export const combineDateTimeStrings = (
	date: string,
	time: string
): Result<string> => {
	const parsedDate = DateTime.fromISO(date);
	if (parsedDate.invalidReason) {
		return Err(`Invalid date for event: ${parsedDate.invalidReason}`);
	}
	const parsedTime = parseTime(time);
	if (!parsedTime.ok) {
		return parsedTime;
	}

	return Ok(add(parsedDate, parsedTime.value).toISO());
};

export const getTime = (date: Date): string =>
	DateTime.fromJSDate(date).toISOTime({
		suppressMilliseconds: true,
		includeOffset: false,
		suppressSeconds: true,
	});

export const getDate = (date: Date): string =>
	DateTime.fromJSDate(date).toISODate();
