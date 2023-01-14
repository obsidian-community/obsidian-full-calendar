import "./EditEvent.css";
import { DateTime, Info } from "luxon";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarSource, OFCEvent, RangeTimeData } from "../../types";
import { Frequency, RRule } from "rrule";
import { ALL_WEEKDAYS } from "rrule/dist/esm/weekday";
import { Options } from "rrule/dist/esm/types";

function makeChangeListener<T>(
	setState: React.Dispatch<React.SetStateAction<T>>,
	fromString: (val: string) => T
): React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> {
	return (e) => setState(fromString(e.target.value));
}

function formatDate(date: Date | null | undefined): string {
	return date?.toISOString().substring(0, 10) ?? "";
}

interface FancyChoiceProps<T extends Labelled> {
	options: T[];
	onChange?: (selection: T[]) => void;
	selection?: T[];
}

const DAYS = Info.weekdays("long").map((label, i) => ({
	label,
	value: ALL_WEEKDAYS[(i + 1) % 7],
}));
const MONTHS = Info.months("long").map((label, value) => ({
	label,
	value: value + 1,
}));
const FREQUENCIES = [
	{ value: Frequency.YEARLY, label: "year", maxInterval: 100 },
	{ value: Frequency.MONTHLY, label: "month", maxInterval: 12 },
	{ value: Frequency.WEEKLY, label: "week", maxInterval: 52 },
	{ value: Frequency.DAILY, label: "day", maxInterval: 365 },
];

interface Labelled {
	label: string;
}

function FancySelect<T extends Labelled>({
	options,
	onChange,
	selection,
}: FancyChoiceProps<T>) {
	const [sel, setSel] = useState(selection ?? []);

	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: ".25em" }}>
			{options.map((value, i) => {
				const isSelected = sel.some((v) => v === value);
				const onClick = () => {
					const newSel = isSelected
						? sel.filter((v) => v !== value)
						: [...sel, value];

					setSel(newSel);

					if (onChange) {
						onChange(newSel);
					}
				};

				return (
					<button
						key={i}
						type="button"
						style={{
							padding: ".6em",
							backgroundColor: isSelected
								? "var(--interactive-accent)"
								: "var(--interactive-normal)",
							color: isSelected
								? "var(--text-on-accent)"
								: "var(--text-normal)",
							borderStyle: "solid",
							borderWidth: "1px",
							borderRadius: "20px",
							fontWeight: "bold",
						}}
						onClick={onClick}
					>
						{value.label}
					</button>
				);
			})}
		</div>
	);
}

interface EditEventProps {
	submit: (frontmatter: OFCEvent, calendarIndex: number) => Promise<void>;
	readonly calendars: CalendarSource[];
	defaultCalendarIndex: number;
	initialEvent?: Partial<OFCEvent>;
	open?: () => Promise<void>;
	deleteEvent?: () => Promise<void>;
}

export const EditEvent = ({
	initialEvent,
	submit,
	open,
	deleteEvent,
	calendars,
	defaultCalendarIndex,
}: EditEventProps) => {
	const [rule, setRule] = useState(
		initialEvent?.type === "recurring"
			? RRule.fromString(initialEvent.rule!!)
			: undefined
	);
	const [date, setDate] = useState(
		(initialEvent?.type === "single"
			? initialEvent.date
			: formatDate(rule?.options.dtstart)) ?? ""
	);

	const frequency = rule
		? FREQUENCIES.find((f) => f.value === rule.options.freq)
		: undefined;
	const isRecurring = rule !== undefined;
	let initialStartTime = "";
	let initialEndTime = "";

	if (
		initialEvent &&
		(initialEvent.allDay === false || initialEvent.allDay === undefined)
	) {
		const { startTime, endTime } = initialEvent as RangeTimeData;
		initialStartTime = startTime || "";
		initialEndTime = endTime || "";
	}

	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(initialEndTime);
	const [title, setTitle] = useState(initialEvent?.title || "");
	const [allDay, setAllDay] = useState(initialEvent?.allDay || false);
	const [calendarIndex, setCalendarIndex] = useState(defaultCalendarIndex);

	const [complete, setComplete] = useState(
		initialEvent?.type === "single" &&
			initialEvent.completed !== null &&
			initialEvent.completed !== undefined
			? initialEvent.completed
			: false
	);

	const [isTask, setIsTask] = useState(
		initialEvent?.type === "single" &&
			initialEvent.completed !== undefined &&
			initialEvent.completed !== null
	);

	const titleRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (titleRef.current) {
			titleRef.current.focus();
		}
	}, [titleRef]);

	const updateRule = (action: (options: Options) => void) => {
		if (rule) {
			const newOptions = { ...rule.options };

			action(newOptions);
			setRule(new RRule(newOptions));
		}
	};

	const updateFrequency = (frequency: string) => {
		if (frequency === "") {
			setRule(undefined);
			return;
		}

		const newRule = new RRule({
			freq: parseInt(frequency, 10),
			interval: rule?.options.interval ?? 1,
			dtstart: rule?.options.dtstart,
			until: rule?.options.until,
			count: rule?.options.count ?? null,
		});

		setRule(newRule);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		await submit(
			{
				...{ title },
				...(allDay
					? { allDay: true }
					: { allDay: false, startTime, endTime }),
				...(rule
					? {
							type: "recurring",
							rule: rule.toString(),
					  }
					: {
							type: "single",
							date,
							completed: isTask ? complete : null,
					  }),
			},
			calendarIndex
		);
	};

	return (
		<>
			<div>
				<p style={{ float: "right" }}>
					{open && <button onClick={open}>Open Note</button>}
				</p>
			</div>

			<form onSubmit={handleSubmit}>
				<p>
					<input
						ref={titleRef}
						type="text"
						id="title"
						value={title}
						placeholder={"Add title"}
						required
						onChange={makeChangeListener(setTitle, (x) => x)}
					/>
				</p>
				<p>
					<select
						id="calendar"
						value={calendarIndex}
						onChange={makeChangeListener(
							setCalendarIndex,
							parseInt
						)}
					>
						{calendars
							.flatMap((cal) =>
								cal.type === "local" || cal.type === "dailynote"
									? [cal]
									: []
							)
							.map((cal, idx) => (
								<option
									key={idx}
									value={idx}
									disabled={
										!(
											initialEvent?.title === undefined ||
											calendars[calendarIndex].type ===
												cal.type
										)
									}
								>
									{cal.type === "local"
										? cal.directory
										: "Daily Note"}
								</option>
							))}
					</select>
				</p>
				<p>
					{!isRecurring && (
						<input
							type="date"
							id="date"
							value={date}
							required={!isRecurring}
							onChange={makeChangeListener(setDate, (x) => x)}
						/>
					)}

					{allDay ? (
						<></>
					) : (
						<>
							<input
								type="time"
								id="startTime"
								value={startTime}
								required
								onChange={makeChangeListener(
									setStartTime,
									(x) => x
								)}
							/>
							-
							<input
								type="time"
								id="endTime"
								value={endTime}
								required
								onChange={makeChangeListener(
									setEndTime,
									(x) => x
								)}
							/>
						</>
					)}
				</p>

				<p>
					<label htmlFor="allDay">All day event</label>
					<input
						id="allDay"
						checked={allDay}
						onChange={(e) => setAllDay(e.target.checked)}
						type="checkbox"
					/>
				</p>

				<div id="recurring-mode">
					<p>The event occurs</p>

					<select
						value={rule?.options.freq ?? ""}
						onChange={(e) => updateFrequency(e.target.value)}
					>
						<option value="">only once</option>
						{FREQUENCIES.map(({ label, value }) => (
							<option key={value} value={value}>
								on a {label} basis
							</option>
						))}
					</select>

					{rule && (
						<>
							<p>and every</p>

							<input
								type="number"
								name="interval"
								value={rule.options.interval}
								onChange={(e) =>
									updateRule(
										(o) =>
											(o.interval = e.target.validity
												.valid
												? parseInt(e.target.value, 10)
												: 1)
									)
								}
								min="1"
								max={frequency!!.maxInterval}
								required
							/>

							<p>{frequency!!.label}s.</p>
						</>
					)}
				</div>

				{rule && ( // aka is recurring
					<div id="recurring-spec">
						<p>It starts from the</p>
						<input
							type="date"
							value={formatDate(rule.options.dtstart)}
							onChange={(e) =>
								updateRule(
									(o) =>
										(o.dtstart = new Date(e.target.value))
								)
							}
						/>

						<p>and will be repeated</p>

						<select
							value={
								rule.options.count === null ? "date" : "count"
							}
							onChange={(e) =>
								updateRule(
									(o) =>
										(o.count =
											e.target.value === "count"
												? 1
												: null)
								)
							}
						>
							<option value="count">
								after a given amount of times
							</option>
							<option value="date">until date</option>
						</select>

						{rule.options.count === null && (
							<input
								name="until"
								type="date"
								value={formatDate(rule.options.until)}
								onChange={(e) =>
									updateRule(
										(o) =>
											(o.until = new Date(e.target.value))
									)
								}
							/>
						)}

						{rule.options.count !== null && (
							<input
								name="count"
								type="number"
								value={rule.options.count}
								min="1"
								onChange={(e) =>
									updateRule(
										(o) =>
											(o.count = o.count =
												e.target.validity.valid
													? parseInt(
															e.target.value,
															10
													  )
													: 1)
									)
								}
								required
							/>
						)}

						{rule.options.freq >= Frequency.MONTHLY && (
							<>
								<p>on these months</p>
								<FancySelect
									options={MONTHS}
									selection={
										rule.options.bymonth?.map(
											(m) => MONTHS[m]
										) ?? MONTHS
									}
									onChange={(e) =>
										updateRule(
											(o) =>
												(o.bymonth = e.map(
													(v) => v.value
												))
										)
									}
								></FancySelect>
							</>
						)}

						{rule.options.freq >= Frequency.WEEKLY && (
							<>
								<p>on these days</p>
								<FancySelect
									options={DAYS}
									selection={
										rule.options.byweekday?.map(
											(d) => DAYS[d]
										) ?? DAYS
									}
									onChange={(e) =>
										updateRule(
											(o) =>
												(o.byweekday = e.map(
													(v) => v.value
												))
										)
									}
								></FancySelect>
							</>
						)}

						{rule.isFullyConvertibleToText() && (
							<p className="note">
								This event will be repeated {rule.toText()}.
							</p>
						)}

						{rule.after(new Date(), true) && (
							<p className="note">
								The next occurrence is the{" "}
								{rule.after(new Date(), true).toString()}.
							</p>
						)}
					</div>
				)}
				<p>
					<label htmlFor="task">Task Event </label>
					<input
						id="task"
						checked={isTask}
						onChange={(e) => setIsTask(e.target.checked)}
						type="checkbox"
					/>
				</p>

				{isTask && (
					<>
						<label htmlFor="taskStatus">Complete? </label>
						<input
							id="taskStatus"
							checked={
								!(complete === false || complete === undefined)
							}
							onChange={(e) =>
								setComplete(
									e.target.checked
										? DateTime.now().toISO()
										: false
								)
							}
							type="checkbox"
						/>
					</>
				)}

				<p
					style={{
						display: "flex",
						justifyContent: "space-between",
						width: "100%",
					}}
				>
					<button type="submit"> Save Event</button>
					<span>
						{deleteEvent && (
							<button
								type="button"
								style={{
									backgroundColor:
										"var(--interactive-normal)",
									color: "var(--background-modifier-error)",
									borderColor:
										"var(--background-modifier-error)",
									borderWidth: "1px",
									borderStyle: "solid",
								}}
								onClick={deleteEvent}
							>
								Delete Event
							</button>
						)}
					</span>
				</p>
			</form>
		</>
	);
};
