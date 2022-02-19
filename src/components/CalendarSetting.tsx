import * as React from "react";
import { SetStateAction, useState } from "react";

import { CalendarSource } from "../types";

interface CalendarSettingsProps {
	options: string[];
	color: string | null | undefined;
	defaultColor: string;
	selected: string | undefined;
	onColorChange: (s: string) => void;
	onDirectoryChange: (s: string) => void;
	deleteCalendar: () => void;
}

export const CalendarSettingRow = ({
	options,
	selected,
	color,
	defaultColor,
	onColorChange,
	onDirectoryChange,
	deleteCalendar,
}: CalendarSettingsProps) => (
	<div style={{ display: "flex", width: "100%", marginBottom: "0.5rem" }}>
		<button type="button" onClick={deleteCalendar}>
			✕
		</button>
		<select
			value={selected || ""}
			onChange={(e) => onDirectoryChange(e.target.value)}
		>
			<option value="" disabled hidden>
				Choose a directory
			</option>
			{options.map((o, idx) => (
				<option key={idx} value={o}>
					{o}
				</option>
			))}
		</select>
		<span style={{ flexGrow: 1 }}></span>
		<input
			type="color"
			value={color || defaultColor}
			onChange={(e) => onColorChange(e.target.value)}
		/>
	</div>
);

interface FolderSettingProps {
	directories: string[];
	submit: (payload: CalendarSource[]) => void;
	initialSetting: CalendarSource[];
	defaultColor: string;
}
export const CalendarSettings = ({
	directories,
	initialSetting,
	defaultColor,
	submit,
}: FolderSettingProps) => {
	const [settings, setSettingState] =
		useState<Partial<CalendarSource>[]>(initialSetting);

	const setSettings = (state: SetStateAction<Partial<CalendarSource>[]>) => {
		setSettingState(state);
		setDirty(true);
	};

	const [dirty, setDirty] = useState(false);

	const usedDirectories = settings.map((s) => s.directory);
	const options = directories.filter(
		(dir) => usedDirectories.indexOf(dir) === -1
	);

	return (
		<div style={{ width: "100%" }}>
			{settings.map((s, idx) => (
				<CalendarSettingRow
					key={idx}
					options={options.concat(s.directory ? [s.directory] : [])}
					selected={s.directory}
					color={s.color}
					onDirectoryChange={(dir) =>
						setSettings((state) => [
							...state.slice(0, idx),
							{ ...state[idx], directory: dir },
							...state.slice(idx + 1),
						])
					}
					onColorChange={(color) =>
						setSettings((state) => [
							...state.slice(0, idx),
							{ ...state[idx], color },
							...state.slice(idx + 1),
						])
					}
					defaultColor={defaultColor}
					deleteCalendar={() =>
						setSettings((state) => [
							...state.slice(0, idx),
							...state.slice(idx + 1),
						])
					}
				/>
			))}
			<div style={{ display: "flex", paddingTop: "1em" }}>
				<button
					onClick={() => {
						submit(
							settings
								.filter(
									(elt) =>
										elt.color !== undefined &&
										elt.directory !== undefined &&
										elt.type !== undefined
								)
								.map((elt) => elt as CalendarSource)
						);
						setDirty(false);
					}}
					style={{
						backgroundColor: dirty
							? "var(--interactive-accent)"
							: undefined,
						color: dirty ? "var(--text-on-accent)" : undefined,
					}}
				>
					{dirty ? "Save" : "Settings Saved"}
				</button>
				<span style={{ flexGrow: 1 }}></span>
				<button
					onClick={() => {
						setSettings((state) => [...state, { type: "local" }]);
					}}
				>
					Add Calendar
				</button>
			</div>
		</div>
	);
};
