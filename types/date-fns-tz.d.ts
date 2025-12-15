declare module "date-fns-tz" {
  export function zonedTimeToUtc(
    date: Date | string | number,
    timeZone: string
  ): Date;

  export function utcToZonedTime(date: Date | number, timeZone: string): Date;

  export function toZonedTime(date: Date | number, timeZone: string): Date;

  export function fromZonedTime(date: Date | number, timeZone: string): Date;
}
