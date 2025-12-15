import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { toUtc, fromUtc } from "../time";
import prisma from "../db";

export interface ListAvailableSlotsParams {
  branchId: number;
  serviceId: number;
  staffId?: number | "any";
  date: string;
}

export interface AvailableSlot {
  startAtUtc: string;
  endAtUtc: string;
  staffId: number;
}

export class AvailabilityError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "AvailabilityError";
  }
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function listAvailableSlots(
  params: ListAvailableSlotsParams
): Promise<AvailableSlot[]> {
  const { branchId, serviceId, staffId, date } = params;
  const normalizedDate = date.trim();

  if (!isoDateRegex.test(normalizedDate)) {
    throw new AvailabilityError("Date must be in YYYY-MM-DD format", 400);
  }

  const parsedDate = parseISO(normalizedDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AvailabilityError("Date must be valid", 400);
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId }
  });

  if (!branch) {
    throw new AvailabilityError("Branch not found", 404);
  }

  const dayRange = getDayRange(normalizedDate, branch.timezone);

  const localToday = format(fromUtc(new Date(), branch.timezone), "yyyy-MM-dd");
  const daysAhead = differenceInCalendarDays(
    parseISO(normalizedDate),
    parseISO(localToday)
  );

  if (daysAhead < 0) {
    throw new AvailabilityError("Date must be today or later", 400);
  }

  if (daysAhead > branch.maxDaysAhead) {
    throw new AvailabilityError(
      `Date must be within ${branch.maxDaysAhead} days`,
      400
    );
  }

  const branchService = await prisma.branchService.findUnique({
    where: {
      branchId_serviceId: {
        branchId,
        serviceId
      }
    },
    include: { service: true }
  });

  if (!branchService || !branchService.active || !branchService.service.active) {
    throw new AvailabilityError("Service is not available at this branch", 404);
  }

  const staffRecords = await prisma.staff.findMany({
    where: { branchId, active: true },
    orderBy: { name: "asc" },
    include: {
      services: {
        where: { serviceId, active: true },
        select: { serviceId: true }
      }
    }
  });

  const eligibleStaff = staffRecords
    .filter((member) => member.services.length > 0)
    .map((member) => member.id);

  let targetStaffIds = eligibleStaff;

  if (typeof staffId === "number") {
    if (!targetStaffIds.includes(staffId)) {
      throw new AvailabilityError("Selected staff is not available", 404);
    }

    targetStaffIds = [staffId];
  }

  if (targetStaffIds.length === 0) {
    return [];
  }

  const shiftRows = await prisma.shift.findMany({
    where: {
      staffId: { in: targetStaffIds },
      branchId,
      startAtUtc: { lt: dayRange.end },
      endAtUtc: { gt: dayRange.start }
    }
  });

  const breakRows = await prisma.break.findMany({
    where: {
      staffId: { in: targetStaffIds },
      branchId,
      startAtUtc: { lt: dayRange.end },
      endAtUtc: { gt: dayRange.start }
    }
  });

  const timeOffRows = await prisma.timeOff.findMany({
    where: {
      staffId: { in: targetStaffIds },
      startAtUtc: { lt: dayRange.end },
      endAtUtc: { gt: dayRange.start }
    }
  });

  const now = new Date();
  const holdRows = await prisma.bookingHold.findMany({
    where: {
      branchId,
      staffId: { in: targetStaffIds },
      expiresAtUtc: { gt: now },
      startAtUtc: { lt: dayRange.end },
      endAtUtc: { gt: dayRange.start }
    }
  });

  const rawSlots = buildSlotsFromSchedule({
    dayStart: dayRange.start,
    dayEnd: dayRange.end,
    slotStepMin: Math.max(1, branch.slotStepMin),
    serviceDurationMin: Math.max(1, branchService.service.durationMin),
    bufferMin: Math.max(0, branch.bookingBufferMin),
    shifts: shiftRows.map((row) => ({
      staffId: row.staffId,
      startAtUtc: row.startAtUtc,
      endAtUtc: row.endAtUtc
    })),
    breaks: breakRows.map((row) => ({
      staffId: row.staffId,
      startAtUtc: row.startAtUtc,
      endAtUtc: row.endAtUtc
    })),
    timeOff: timeOffRows.map((row) => ({
      staffId: row.staffId,
      startAtUtc: row.startAtUtc,
      endAtUtc: row.endAtUtc
    })),
    holds: holdRows.map((row) => ({
      staffId: row.staffId,
      startAtUtc: row.startAtUtc,
      endAtUtc: row.endAtUtc
    }))
  });

  const slots = rawSlots
    .sort((a, b) => a.start - b.start)
    .map((slot) => ({
      staffId: slot.staffId,
      startAtUtc: new Date(slot.start).toISOString(),
      endAtUtc: new Date(slot.end).toISOString()
    }));

  return slots;
}

export interface ScheduleInterval {
  staffId: number;
  startAtUtc: Date;
  endAtUtc: Date;
}

interface Interval {
  start: number;
  end: number;
}

export interface BuildSlotsParams {
  dayStart: Date;
  dayEnd: Date;
  slotStepMin: number;
  serviceDurationMin: number;
  bufferMin: number;
  shifts: ScheduleInterval[];
  breaks?: ScheduleInterval[];
  timeOff?: ScheduleInterval[];
  holds?: ScheduleInterval[];
}

interface RawSlot {
  staffId: number;
  start: number;
  end: number;
}

export function buildSlotsFromSchedule(
  params: BuildSlotsParams
): RawSlot[] {
  const {
    dayStart,
    dayEnd,
    slotStepMin,
    serviceDurationMin,
    bufferMin,
    shifts,
    breaks = [],
    timeOff = [],
    holds = []
  } = params;

  if (dayEnd <= dayStart) {
    return [];
  }

  const range: Interval = {
    start: dayStart.getTime(),
    end: dayEnd.getTime()
  };

  const shiftMap = groupByStaff(shifts, range);
  if (shiftMap.size === 0) {
    return [];
  }

  const breakMap = groupByStaff(breaks, range);
  const timeOffMap = groupByStaff(timeOff, range);
  const holdMap = groupByStaff(holds, range, bufferMin);

  const stepMs = Math.max(1, slotStepMin) * 60 * 1000;
  const serviceMs = Math.max(1, serviceDurationMin) * 60 * 1000;
  const anchor = range.start;

  const slots: RawSlot[] = [];

  for (const [staffId, staffShifts] of shiftMap.entries()) {
    let availability = staffShifts;

    const blockers = [...(breakMap.get(staffId) ?? []), ...(timeOffMap.get(staffId) ?? [])];
    if (blockers.length > 0) {
      availability = subtractIntervals(availability, blockers);
    }

    const holdsForStaff = holdMap.get(staffId) ?? [];
    if (holdsForStaff.length > 0 && availability.length > 0) {
      availability = subtractIntervals(availability, holdsForStaff);
    }

    for (const interval of availability) {
      const firstStart = alignToStep(Math.max(interval.start, anchor), stepMs, anchor);
      for (
        let cursor = firstStart;
        cursor + serviceMs <= interval.end;
        cursor += stepMs
      ) {
        slots.push({
          staffId,
          start: cursor,
          end: cursor + serviceMs
        });
      }
    }
  }

  return slots;
}

function groupByStaff(
  items: ScheduleInterval[],
  dayRange: Interval,
  bufferMin = 0
): Map<number, Interval[]> {
  const bufferMs = Math.max(0, bufferMin) * 60 * 1000;
  const map = new Map<number, Interval[]>();

  for (const item of items) {
    const interval: Interval = {
      start: item.startAtUtc.getTime() - bufferMs,
      end: item.endAtUtc.getTime() + bufferMs
    };

    const clamped = clampInterval(interval, dayRange);
    if (!clamped) {
      continue;
    }

    if (!map.has(item.staffId)) {
      map.set(item.staffId, []);
    }

    map.get(item.staffId)!.push(clamped);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.start - b.start);
  }

  return map;
}

function clampInterval(interval: Interval, range: Interval): Interval | null {
  const start = Math.max(interval.start, range.start);
  const end = Math.min(interval.end, range.end);
  return start < end ? { start, end } : null;
}

function subtractIntervals(base: Interval[], blockers: Interval[]): Interval[] {
  if (blockers.length === 0) {
    return base.slice();
  }

  const sortedBlockers = blockers.slice().sort((a, b) => a.start - b.start);
  const result: Interval[] = [];

  for (const current of base) {
    let cursor = current.start;

    for (const blocker of sortedBlockers) {
      if (blocker.end <= cursor) {
        continue;
      }

      if (blocker.start >= current.end) {
        break;
      }

      if (blocker.start > cursor) {
        result.push({ start: cursor, end: Math.min(blocker.start, current.end) });
      }

      cursor = Math.max(cursor, blocker.end);

      if (cursor >= current.end) {
        break;
      }
    }

    if (cursor < current.end) {
      result.push({ start: cursor, end: current.end });
    }
  }

  return result;
}

function alignToStep(value: number, step: number, anchor: number): number {
  if (step <= 0) {
    return value;
  }

  const offset = value - anchor;
  const remainder = ((offset % step) + step) % step;
  if (remainder === 0) {
    return value;
  }

  return value + (step - remainder);
}

export function getDayRange(date: string, timezone: string) {
  const nextDay = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
  const start = toUtc(`${date}T00:00:00`, timezone);
  const end = toUtc(`${nextDay}T00:00:00`, timezone);
  return { start, end };
}
