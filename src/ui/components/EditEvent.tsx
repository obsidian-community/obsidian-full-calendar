import { DateTime } from "luxon";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarSource, OFCEvent, RangeTimeData } from "../../types";
import { RRule } from "rrule";

function makeChangeListener<T>(
	setState: React.Dispatch<React.SetStateAction<T>>,
	fromString: (val: string) => T
): React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> {
	return (e) => setState(fromString(e.target.value));
}

function formatDate(date: Date | null | undefined): string {
	return date?.toISOString().substring(0, 10) ?? "";
}

interface DayChoiceProps {
	code: string;
	label: string;
	isSelected: boolean;
	onClick: (code: string) => void;
}

const DayChoice = ({ code, label, isSelected, onClick }: DayChoiceProps) => (
	<button
		type="button"
		style={{
			marginLeft: "0.25rem",
			marginRight: "0.25rem",
			padding: "0",
			backgroundColor: isSelected
				? "var(--interactive-accent)"
				: "var(--interactive-normal)",
			color: isSelected ? "var(--text-on-accent)" : "var(--text-normal)",
			borderStyle: "solid",
			borderWidth: "1px",
			borderRadius: "50%",
			width: "25px",
			height: "25px",
		}}
		onClick={() => onClick(code)}
	>
		<b>{label[0]}</b>
	</button>
);

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

	const updateRule = (action: () => void) => {
		action();
		setRule(rule);
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
					<label htmlFor="allDay">All day event </label>
					<input
						id="allDay"
						checked={allDay}
						onChange={(e) => setAllDay(e.target.checked)}
						type="checkbox"
					/>
				</p>
				<p>
					<label htmlFor="recurring">Recurring Event </label>
					<input
						id="recurring"
						checked={isRecurring}
						onChange={(e) =>
							setRule(e.target.checked ? new RRule() : undefined)
						}
						type="checkbox"
					/>
				</p>

				{rule && (
					<>
						<p>Every</p>

						<p>
							Starts recurring
							<input
								type="date"
								id="startDate"
								value={formatDate(rule.options.dtstart)}
								onChange={(e) =>
									updateRule(
										() =>
											(rule.options.dtstart = new Date(
												e.target.value
											))
									)
								}
							/>
							and stops recurring
							<input
								type="date"
								id="endDate"
								value={formatDate(rule.options.until)}
								onChange={(e) =>
									updateRule(
										() =>
											(rule.options.until = new Date(
												e.target.value
											))
									)
								}
							/>
						</p>

						{rule.isFullyConvertibleToText() && (
							<p>
								This event will be repeated {rule.toText()}
								<br />
							</p>
						)}

						{rule.after(new Date(), true) && (
							<p>
								The next occurrence is the{" "}
								{rule.after(new Date(), true).toString()}.
							</p>
						)}
					</>
				)}
				<p>
					<label htmlFor="task">Task Event </label>
					<input
						id="task"
						checked={isTask}
						onChange={(e) => {
							setIsTask(e.target.checked);
						}}
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
