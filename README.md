# Obsidian Full Calendar Plugin

Keep your calendar in your vault! This plugin integrates the [Full Calendar](https://github.com/fullcalendar/fullcalendar) library into your Obsidian Vault so that you can keep your events and plans alongside your tasks and notes, and link freely between all of them. Each event is stored as a separate note with special frontmatter so you can take notes and add context to any event on your calendar.

![Sample Calendar](docs/assets/sample-calendar.png)

- [Obsidian Full Calendar Plugin](#obsidian-full-calendar-plugin)
  - [Features](#features)
    - [Creating Events](#creating-events)
      - [Event modal](#event-modal)
      - [Click-and-drag to make an event](#click-and-drag-to-make-an-event)
      - [Full day events](#full-day-events)
      - [Recurring events](#recurring-events)
    - [Editing Events](#editing-events)
      - [Change time of event by dragging its endpoint](#change-time-of-event-by-dragging-its-endpoint)
      - [Move an event around on a day or between days](#move-an-event-around-on-a-day-or-between-days)
  - [Coming soon](#coming-soon)
    - [Import from Google Calendar](#import-from-google-calendar)
    - [Subscribe to public calendar feeds](#subscribe-to-public-calendar-feeds)
    - [Create event notes with a template](#create-event-notes-with-a-template)
    - [Support for multiple calendars with different colors](#support-for-multiple-calendars-with-different-colors)
  - [Long term plans](#long-term-plans)
    - [Track tasks in the calendar](#track-tasks-in-the-calendar)

## Features

### Creating Events

#### Event modal

Use the "Create event" command to bring up the event modal to add a new event. Clicking on any existing event will also bring up the modal for editing.
![Create event with modal](docs/assets/create-event-modal.gif)

#### Click-and-drag to make an event

Just click-and-drag on the calendar to create an event. A modal will pop up where you can fill in the details and tweak the timing.
![Create event](docs/assets/create-event.gif)

#### Full day events

Can create events that last all day instead of giving a start and end time.
![Full day event](docs/assets/create-event-fullday.gif)

#### Recurring events

Let a single event note show up on a set schedule by checking the "Recurring event" box in the event modal.

![Recurring event](docs/assets/create-event-recurring.gif)

### Editing Events

In addition to editing events through the modal, you can also click-and-drag
to change the time range or the date of an event.

#### Change time of event by dragging its endpoint

![time range](docs/assets/edit-event-drag.gif)

#### Move an event around on a day or between days

![moving an event](docs/assets/moving-event.gif)

## Coming soon

### Import from Google Calendar

Make the transition easier by loading in all your events from an existing Google Calendar and maintain a one-way sync.

### Subscribe to public calendar feeds

Add auto-updating read-only feeds for your friends' calendars.

### Create event notes with a template

Support for the core Templates plugin and Templater.

### Support for multiple calendars with different colors

## Long term plans

### Track tasks in the calendar

Surface tasks from throughout your vault on your calendar, and schedule them in blocks during your day to fill out your agenda. Inspired by (the as-yet-unreleased) [amie calendar](https://amie.so).
