import "./overrides.css";
import {
    ItemView,
    MarkdownView,
    Menu,
    Notice,
    TFile,
    WorkspaceLeaf,
} from "obsidian";
import { Calendar, EventSourceInput } from "@fullcalendar/core";
import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "../main";
import { FCError, PLUGIN_SLUG } from "../types";
import {
    dateEndpointsToFrontmatter,
    fromEventApi,
    toEventInput,
} from "../interop";
import { renderOnboarding } from "./onboard";
import { EditableEvent, LocalEvent } from "../models/Event";
import { eventFromApi } from "../models";
import { DateTime } from "luxon";
import { getColors } from "../models/util";
import { openFileForEvent } from "./actions";
import { launchCreateModal, launchEditModal } from "./event_modal";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";
export const FULL_CALENDAR_SIDEBAR_VIEW_TYPE = "full-calendar-sidebar-view";

export class CalendarView extends ItemView {
    fullCalendarView: Calendar | null;
    plugin: FullCalendarPlugin;
    inSidebar: boolean;

    constructor(
        leaf: WorkspaceLeaf,
        plugin: FullCalendarPlugin,
        inSidebar = false
    ) {
        super(leaf);
        this.plugin = plugin;
        this.fullCalendarView = null;
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
                ({ events, editable, color, id }): EventSourceInput => ({
                    id,
                    events: events.flatMap(
                        (e) => toEventInput(e.id, e.event) || []
                    ),
                    editable,
                    ...getColors(color),
                })
            );

        this.fullCalendarView = renderCalendar(calendarEl, sources, {
            forceNarrow: this.inSidebar,
            eventClick: async (info) => {
                if (
                    info.jsEvent.getModifierState("Control") ||
                    info.jsEvent.getModifierState("Meta")
                ) {
                    if (this.plugin.cache) {
                        await openFileForEvent(
                            this.plugin.cache,
                            this.app,
                            info.event.id
                        );
                    }
                } else {
                    console.log("clicking on event");
                    launchEditModal(this.plugin, info.event.id);
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
                launchCreateModal(this.plugin, partialEvent);
            },
            modifyEvent: async (newEvent, oldEvent) => {
                try {
                    const didModify =
                        await this.plugin.cache?.updateEventWithId(
                            oldEvent.id,
                            fromEventApi(newEvent)
                        );
                    return !!didModify;
                } catch (e: any) {
                    console.error(e);
                    new Notice(e.message);
                    return false;
                }
            },

            eventMouseEnter: async (info) => {
                const location = this.plugin.cache?.getRelations(
                    info.event.id
                ).location;
                if (location) {
                    this.app.workspace.trigger("hover-link", {
                        event: info.jsEvent,
                        source: PLUGIN_SLUG,
                        hoverParent: calendarEl,
                        targetEl: info.jsEvent.target,
                        linktext: location.path,
                        sourcePath: location.path,
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
        window.fc = this.fullCalendarView;

        this.plugin.cache.on("update", ({ toRemove, toAdd }) => {
            console.log("cache updated!", { toRemove, toAdd });
            toRemove.forEach((id) => {
                const event = this.fullCalendarView?.getEventById(id);
                if (event) {
                    console.log("removing event", event.toPlainObject());
                    event.remove();
                } else {
                    console.warn(
                        `Event with id=${id} was slated to be removed but does not exist in the calendar.`
                    );
                }
            });
            toAdd.forEach(({ id, event, calendarId }) => {
                console.log("adding event", { id, event });
                this.fullCalendarView?.addEvent(
                    {
                        ...toEventInput(id, event),
                    },
                    calendarId
                );
            });
        });
    }

    onResize(): void {
        if (this.fullCalendarView) {
            this.fullCalendarView.render();
        }
    }

    async onClose() {
        if (this.fullCalendarView) {
            this.fullCalendarView.destroy();
            this.fullCalendarView = null;
        }
    }
}
