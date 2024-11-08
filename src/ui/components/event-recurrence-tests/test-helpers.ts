import { Options, RRule } from "rrule";

export const defaultOptions: Partial<Options> = {
    freq: RRule.DAILY,
    dtstart: new Date(),
    interval: 1,
    wkst: RRule.SU,
    count: 1,
    until: new Date(),
    tzid: "UTC",
    bysetpos: [1],
    bymonth: [1],
    bymonthday: [2],
    bynmonthday: [3],
    byyearday: [20],
    byweekno: [1],
    byweekday: [RRule.WE],
    bynweekday: [[1]],
    byhour: [2],
    byminute: [42],
    bysecond: [21],
    byeaster: 1,
};
