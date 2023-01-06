import "./overrides.css";
import { ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { Calendar, EventApi, EventSourceInput } from "@fullcalendar/core";
import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "../main";
import { EventModal } from "./modal";
import { FCError, PLUGIN_SLUG } from "../types";
import {
    dateEndpointsToFrontmatter,
    fromEventApi,
    toEventInput,
} from "../interop";
import { IcsSource } from "../models/IcsSource";
import { NoteSource } from "../models/NoteSource";
import { RemoteSource } from "../models/RemoteSource";
import { renderOnboarding } from "./onboard";
import { CalendarEvent, EditableEvent, LocalEvent } from "../models/Event";
import { NoteEvent } from "../models/NoteEvent";
import { eventFromApi } from "../models";
import { DateTime } from "luxon";
import { DailyNoteSource } from "../models/DailyNoteSource";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import { getColors } from "../models/util";
import EventCache from "src/core/EventCache";
import internal from "stream";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";
export const FULL_CALENDAR_SIDEBAR_VIEW_TYPE = "full-calendar-sidebar-view";

export class CalendarView extends ItemView {
    calendar: Calendar | null;
    plugin: FullCalendarPlugin;
    cacheCallback: (file: TFile) => void;
    inSidebar: boolean;

    constructor(
        leaf: WorkspaceLeaf,
        plugin: FullCalendarPlugin,
        inSidebar = false
    ) {
        super(leaf);
        this.plugin = plugin;
        this.calendar = null;
        this.cacheCallback = this.onCacheUpdate.bind(this);
        this.inSidebar = inSidebar;
    }

    getIcon(): string {
        return "calendar-glyph";
    }

    getViewType() {
        return FULL_CALENDAR_VIEW_TYPE;
    }

    getDisplayText() {
        return this.inSidebar ? "Full Calendar" : "Calendar";
    }

    async onCacheUpdate(file: TFile) {
        await this.plugin.cache?.fileUpdated(file);
    }

    async onOpen() {
        await this.plugin.loadSettings();
        if (!this.plugin.cache) {
            new Notice("Full Calendar event cache not loaded.");
            return;
        }
        if (!this.plugin.cache.initialized) {
            await this.plugin.cache.populate();
        }

        const container = this.containerEl.children[1];
        container.empty();
        let calendarEl = container.createEl("div");

        if (
            this.plugin.settings.calendarSources.filter(
                (s) => s.type !== "FOR_TEST_ONLY" && s.type !== "gcal"
            ).length === 0
        ) {
            renderOnboarding(this.app, this.plugin, calendarEl);
            return;
        }

        const sources: EventSourceInput[] = this.plugin.cache
            .getAllEvents()
            .map(
                ({ events, editable, color }): EventSourceInput => ({
                    events: events.flatMap(
                        (e) => toEventInput(e.id, e.event) || []
                    ),
                    editable,
                    ...getColors(color),
                })
            );

        this.calendar = renderCalendar(calendarEl, sources, {
            forceNarrow: this.inSidebar,
            eventClick: async (info) => {
                if (
                    info.jsEvent.getModifierState("Control") ||
                    info.jsEvent.getModifierState("Meta")
                ) {
                    const event = this.plugin.cache?.getEventById(
                        info.event.id
                    );
                    if (!event) {
                        return;
                    }
                    let leaf = this.app.workspace.getMostRecentLeaf();
                    if (leaf) {
                        // TODO: Uncomment and fix
                        // event.openIn(leaf, this.app.workspace);
                    }
                } else {
                    new EventModal(
                        this.app,
                        this.plugin,
                        this.calendar
                    ).editInModal(info.event);
                }
            },
            select: async (start, end, allDay, viewType) => {
                if (viewType === "dayGridMonth") {
                    // Month view will set the end day to the next day even on a single-day event.
                    // This is problematic when moving an event created in the month view to the
                    // time grid to give it a time.

                    // The fix is just to subtract 1 from the end date before processing.
                    end.setDate(end.getDate() - 1);
                }
                const partialEvent = dateEndpointsToFrontmatter(
                    start,
                    end,
                    allDay
                );
                let modal = new EventModal(
                    this.app,
                    this.plugin,
                    this.calendar,
                    partialEvent
                );
                modal.open();
            },
            modifyEvent: async (newEvent, oldEvent) => {
                try {
                    const existingEvent = await eventFromApi(
                        this.app.metadataCache,
                        this.app.vault,
                        this.plugin.settings,
                        oldEvent
                    );
                    if (!existingEvent) {
                        return false;
                    }
                    const frontmatter = fromEventApi(newEvent);
                    await existingEvent.setData(frontmatter);
                } catch (e: any) {
                    new Notice(e.message);
                    return false;
                }
                return true;
            },

            eventMouseEnter: async (info) => {
                const event = await eventFromApi(
                    this.app.metadataCache,
                    this.app.vault,
                    this.plugin.settings,
                    info.event
                );
                if (event instanceof LocalEvent) {
                    this.app.workspace.trigger("hover-link", {
                        event: info.jsEvent,
                        source: PLUGIN_SLUG,
                        hoverParent: calendarEl,
                        targetEl: info.jsEvent.target,
                        linktext: event.path,
                        sourcePath: event.path,
                    });
                }
            },
            firstDay: this.plugin.settings.firstDay,
            initialView: this.plugin.settings.initialView,
            timeFormat24h: this.plugin.settings.timeFormat24h,
            openContextMenuForEvent: async (e, mouseEvent) => {
                const menu = new Menu();
                const event = await eventFromApi(
                    this.app.metadataCache,
                    this.app.vault,
                    this.plugin.settings,
                    e
                );
                if (event instanceof EditableEvent) {
                    if (!event.isTask) {
                        menu.addItem((item) =>
                            item
                                .setTitle("Turn into task")
                                .onClick(async () => {
                                    await event.setIsTask(true);
                                })
                        );
                    } else {
                        menu.addItem((item) =>
                            item
                                .setTitle("Remove checkbox")
                                .onClick(async () => {
                                    await event.setIsTask(false);
                                })
                        );
                    }
                }
                if (event instanceof LocalEvent) {
                    menu.addSeparator();
                    menu.addItem((item) =>
                        item.setTitle("Go to note").onClick(() => {
                            let leaf = this.app.workspace.getMostRecentLeaf();
                            if (leaf) {
                                event.openIn(leaf, this.app.workspace);
                                new Notice(`Opening "${e.title}"`);
                            }
                        })
                    );
                    menu.addItem((item) =>
                        item.setTitle("Delete").onClick(async () => {
                            await event.delete();
                            new Notice(`Deleted event "${e.title}".`);
                        })
                    );
                } else {
                    menu.addItem((item) => {
                        item.setTitle(
                            "No actions available on remote events"
                        ).setDisabled(true);
                    });
                }

                menu.showAtMouseEvent(mouseEvent);
            },
            toggleTask: async (e, isDone) => {
                const event = await eventFromApi(
                    this.app.metadataCache,
                    this.app.vault,
                    this.plugin.settings,
                    e
                );
                if (!event) {
                    return false;
                }

                const newData = event.data;
                if (newData.type !== "single") {
                    return false;
                }
                if (isDone) {
                    const completionDate = DateTime.now().toISO();
                    newData.completed = completionDate;
                } else {
                    newData.completed = false;
                }
                try {
                    event.setData(newData);
                } catch (e) {
                    if (e instanceof FCError) {
                        new Notice(e.message);
                    }
                    return false;
                }
                return true;
            },
        });
        // @ts-ignore
        window.calendar = this.calendar;

        this.plugin.settings.calendarSources
            .flatMap((s) => (s.type === "ical" ? [s] : []))
            .map((s) => new IcsSource(s))
            .map((s) => s.toApi())
            .forEach((resultPromise) =>
                resultPromise.then((result) => {
                    if (result instanceof FCError) {
                        new Notice(result.message);
                    } else {
                        this.calendar?.addEventSource(result);
                    }
                })
            );

        this.plugin.settings.calendarSources
            .flatMap((s) =>
                s.type === "caldav" || s.type === "icloud" ? [s] : []
            )
            .map((s) => new RemoteSource(s))
            .map((s) => s.toApi())
            .forEach((resultPromise) =>
                resultPromise.then((result) => {
                    if (result instanceof FCError) {
                        new Notice(result.message);
                    } else {
                        this.calendar?.addEventSource(result);
                    }
                })
            );
        this.plugin.settings.calendarSources
            .flatMap((s) => (s.type === "dailynote" ? [s] : []))
            .map(
                (s) =>
                    new DailyNoteSource(
                        this.app.vault,
                        this.app.metadataCache,
                        s
                    )
            )
            .map((s) => s.toApi())
            .forEach((resultPromise) =>
                resultPromise.then((result) => {
                    if (result instanceof FCError) {
                        new Notice(result.message);
                    } else {
                        this.calendar?.addEventSource(result);
                    }
                })
            );
        this.registerEvent(
            this.app.metadataCache.on("changed", this.cacheCallback)
        );
        this.registerEvent(
            this.app.vault.on("delete", (file) => {
                if (file instanceof TFile) {
                    // HACK: Think of a way to make this generic for all types of local events.
                    let id =
                        NoteEvent.ID_PREFIX +
                        CalendarEvent.ID_SEPARATOR +
                        file.path;
                    const event = this.calendar?.getEventById(id);
                    if (event) {
                        event.remove();
                    }
                }
            })
        );
        this.registerEvent(
            this.app.vault.on("rename", (file, oldPath) => {
                // HACK: Think of a way to make this generic for all types of local events.
                const oldEvent = this.calendar?.getEventById(
                    NoteEvent.ID_PREFIX + CalendarEvent.ID_SEPARATOR + oldPath
                );
                if (oldEvent) {
                    oldEvent.remove();
                }
                // Rename doesn't change any of the metadata so we also need to trigger
                // that same callback.
                if (file instanceof TFile) {
                    this.onCacheUpdate(file);
                }
            })
        );
    }

    onResize(): void {
        if (this.calendar) {
            this.calendar.render();
        }
    }

    async onClose() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }
}
