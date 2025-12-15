import { toZonedTime } from "date-fns-tz";
import { toDate } from "date-fns-tz/toDate";

// Convert a local ISO date/time string in branch timezone to UTC Date.
export function toUtc(dateTime: string, timezone: string): Date {
  return toDate(dateTime, { timeZone: timezone });
}

// Convert a UTC Date to local Date in branch timezone.
export function fromUtc(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}
