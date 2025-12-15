import { describe, it, expect } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { buildSlotsFromSchedule, getDayRange } from "./engine";

const TIMEZONE = "Europe/Prague";
const toUtc = (value: string) => fromZonedTime(value, TIMEZONE);

function slotStarts(slots: { start: number }[]) {
  return slots.map((slot) => new Date(slot.start).toISOString());
}

const BASE_DATE = "2025-01-15";
const BASE_RANGE = getDayRange(BASE_DATE, TIMEZONE);
const BASE_PARAMS = {
  dayStart: BASE_RANGE.start,
  dayEnd: BASE_RANGE.end,
  slotStepMin: 5,
  serviceDurationMin: 30,
  bufferMin: 0
};

describe("availability engine", () => {
  it("blocks slots that overlap booking holds", () => {
    const shifts = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T12:00:00`)
      }
    ];

    const holds = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:30:00`),
        endAtUtc: toUtc(`${BASE_DATE}T10:00:00`)
      }
    ];

    const slots = buildSlotsFromSchedule({ ...BASE_PARAMS, shifts, holds });
    const starts = slotStarts(slots);

    expect(starts).toContain(toUtc(`${BASE_DATE}T09:00:00`).toISOString());
    expect(starts).not.toContain(toUtc(`${BASE_DATE}T09:30:00`).toISOString());
  });

  it("blocks slots that overlap confirmed bookings", () => {
    const shifts = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T12:00:00`)
      }
    ];

    const bookings = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:30:00`),
        endAtUtc: toUtc(`${BASE_DATE}T10:00:00`)
      }
    ];

    const slots = buildSlotsFromSchedule({
      ...BASE_PARAMS,
      shifts,
      bookings
    });
    const starts = slotStarts(slots);

    expect(starts).toContain(toUtc(`${BASE_DATE}T09:00:00`).toISOString());
    expect(starts).not.toContain(toUtc(`${BASE_DATE}T09:30:00`).toISOString());
  });

  it("enforces buffer around holds", () => {
    const shifts = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T11:00:00`)
      }
    ];

    const holds = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T09:30:00`)
      }
    ];

    const slots = buildSlotsFromSchedule({
      ...BASE_PARAMS,
      shifts,
      holds,
      bufferMin: 10
    });

    const starts = slotStarts(slots);
    expect(starts).not.toContain(toUtc(`${BASE_DATE}T09:30:00`).toISOString());
    expect(starts).toContain(toUtc(`${BASE_DATE}T09:40:00`).toISOString());
  });

  it("removes slots during breaks or time off", () => {
    const shifts = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T11:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T14:00:00`)
      }
    ];

    const breaks = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T12:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T12:30:00`)
      }
    ];

    const slots = buildSlotsFromSchedule({
      ...BASE_PARAMS,
      shifts,
      breaks
    });

    const starts = slotStarts(slots);
    expect(starts).not.toContain(toUtc(`${BASE_DATE}T12:15:00`).toISOString());
  });

  it("handles shifts that span midnight", () => {
    const day = "2025-01-16";
    const { start, end } = getDayRange(day, TIMEZONE);
    const shifts = [
      {
        staffId: 2,
        startAtUtc: fromZonedTime("2025-01-15T22:00:00", TIMEZONE),
        endAtUtc: fromZonedTime("2025-01-16T02:00:00", TIMEZONE)
      }
    ];

    const slots = buildSlotsFromSchedule({
      dayStart: start,
      dayEnd: end,
      slotStepMin: 30,
      serviceDurationMin: 60,
      bufferMin: 0,
      shifts
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(new Date(slots[0].start).toISOString()).toBe(
      toUtc(`${day}T00:00:00`).toISOString()
    );
  });

  it("accounts for DST transition days", () => {
    const range = getDayRange("2025-03-30", TIMEZONE);
    const duration = range.end.getTime() - range.start.getTime();
    expect(duration).toBe(23 * 60 * 60 * 1000);

    const shifts = [
      {
        staffId: 3,
        startAtUtc: toUtc("2025-03-30T01:00:00"),
        endAtUtc: toUtc("2025-03-30T04:00:00")
      }
    ];

    const slots = buildSlotsFromSchedule({
      dayStart: range.start,
      dayEnd: range.end,
      slotStepMin: 60,
      serviceDurationMin: 60,
      bufferMin: 0,
      shifts
    });

    const starts = slotStarts(slots);
    expect(starts).toContain(toUtc("2025-03-30T01:00:00").toISOString());
    expect(starts).toContain(toUtc("2025-03-30T03:00:00").toISOString());
  });

  it("returns earliest slot when any barber is requested", () => {
    const shifts = [
      {
        staffId: 1,
        startAtUtc: toUtc(`${BASE_DATE}T09:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T12:00:00`)
      },
      {
        staffId: 2,
        startAtUtc: toUtc(`${BASE_DATE}T08:00:00`),
        endAtUtc: toUtc(`${BASE_DATE}T11:00:00`)
      }
    ];

    const slots = buildSlotsFromSchedule({
      ...BASE_PARAMS,
      slotStepMin: 60,
      serviceDurationMin: 60,
      shifts
    });

    const ordered = [...slots].sort((a, b) => a.start - b.start);
    expect(ordered[0].staffId).toBe(2);
    expect(new Date(ordered[0].start).toISOString()).toBe(
      toUtc(`${BASE_DATE}T08:00:00`).toISOString()
    );
  });
});
