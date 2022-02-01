import FullCalendarPlugin, { NewEventModal } from "main";
import { App } from "obsidian";
import * as React from "react";
import { useState } from "react";
import Select from "react-select";

function makeChangeListener<T>(
	setState: React.Dispatch<React.SetStateAction<T>>,
	fromString: (val: string) => T
): React.ChangeEventHandler<HTMLInputElement> {
	return (e) => setState(fromString(e.target.value));
}

const DAY_MAP = {
	U: "Sunday",
	M: "Monday",
	T: "Tuesday",
	W: "Wednesday",
	R: "Thursday",
	F: "Friday",
	S: "Saturday",
};

const DaySelect = ({ onChange }: { onChange: (days: string[]) => void }) => {
	const [selected, setSelectedState] = useState<string[]>([]);
	const setSelected = (newSelected: string[]) => {
		onChange(newSelected);
		setSelectedState(newSelected);
	};
	return (
		<div>
			<h4>Days of the Week</h4>
			{Object.entries(DAY_MAP).map(([code, label]) => (
				<span key={code}>
					<label htmlFor={`day-${code}`}>{label}</label>
					<input
						type="checkbox"
						id={`day-${code}`}
						checked={selected.includes(code)}
						onChange={(e) =>
							e.target.checked
								? setSelected([code, ...selected])
								: setSelected(selected.filter((c) => c != code))
						}
					/>
					<br />
				</span>
			))}
		</div>
	);
};

export const EditEvent = ({
	app,
	modal,
	plugin,
}: {
	app: App;
	plugin: FullCalendarPlugin;
	modal: NewEventModal;
}) => {
	const [date, setDate] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [title, setTitle] = useState("");
	const [isRecurring, setIsRecurring] = useState(false);
	const [endDate, setEndDate] = useState("");
	const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		let page: string;
		if (isRecurring) {
			page = `---
title: ${title}
type: recurring
daysOfWeek: ${JSON.stringify(daysOfWeek)}
startTime: ${startTime}
endTime: ${endTime}
---\n`;
		} else {
			page = `---
title: ${title}
date: ${date}
startTime: ${startTime}
endTime: ${endTime}
---\n`;
		}
		const file = await app.vault.create(`events/${title}.md`, page);
		let leaf = app.workspace.getMostRecentLeaf();
		// await leaf.openFile(file);
		await plugin.activateView();
		modal.close();
	};

	return (
		<form onSubmit={handleSubmit}>
			<p>
				<label htmlFor="recurring">Recurring Event </label>
				<input
					checked={isRecurring}
					onChange={(e) => setIsRecurring(e.target.checked)}
					type="checkbox"
				/>
			</p>
			<p>
				<label htmlFor="title">Title </label>
				<input
					type="text"
					id="title"
					value={title}
					required
					onChange={makeChangeListener(setTitle, (x) => x)}
				/>
			</p>
			<p>
				<label htmlFor="date">
					{isRecurring ? "Start date" : "Date"}{" "}
				</label>
				<input
					type="date"
					id="date"
					value={date}
					required={!isRecurring}
					onChange={makeChangeListener(setDate, (x) => x)}
				/>
			</p>
			<p>
				<label htmlFor="startTime">Start Time </label>
				<input
					type="time"
					id="startTime"
					value={startTime}
					required
					onChange={makeChangeListener(setStartTime, (x) => x)}
				/>
			</p>
			<p>
				<label htmlFor="endTime">End Time </label>
				<input
					type="time"
					id="endTime"
					value={endTime}
					required
					onChange={makeChangeListener(setEndTime, (x) => x)}
				/>
			</p>
			{isRecurring && (
				<DaySelect onChange={(days) => setDaysOfWeek(days)} />
			)}

			<p>
				<input type="submit" />
			</p>
		</form>
	);
};
