import { addMinutes, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Resend } from "resend";
import prisma from "./db";
import { fromUtc } from "./time";
import { listAvailableSlots, AvailabilityError } from "./availability/engine";

const HOLD_EXPIRATION_MIN = 10;
const MIN_NAME_LENGTH = 2;

export class BookingError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "BookingError";
  }
}

export interface IntervalLike {
  startAtUtc: Date;
  endAtUtc: Date;
}

export interface CreateHoldParams {
  branchId: number;
  serviceId: number;
  staffId: number;
  startAtUtc: string;
  clientFingerprint?: string;
}

export interface ConfirmBookingParams {
  holdId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  note?: string;
}

export interface SerializedHold {
  id: number;
  branchId: number;
  staffId: number;
  serviceId: number;
  startAtUtc: string;
  endAtUtc: string;
  expiresAtUtc: string;
}

export interface SerializedBooking {
  id: number;
  branchId: number;
  staffId: number;
  serviceId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  startAtUtc: string;
  endAtUtc: string;
  status: string;
}

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function expandWithBuffer(interval: IntervalLike, bufferMin: number) {
  const bufferMs = Math.max(0, bufferMin) * 60 * 1000;
  return {
    start: interval.startAtUtc.getTime() - bufferMs,
    end: interval.endAtUtc.getTime() + bufferMs
  };
}

export function conflictsWithExisting(
  candidate: IntervalLike,
  existing: IntervalLike[],
  bufferMin: number
): boolean {
  const candidateWindow = expandWithBuffer(candidate, bufferMin);

  return existing.some((item) => {
    return (
      item.startAtUtc.getTime() < candidateWindow.end &&
      item.endAtUtc.getTime() > candidateWindow.start
    );
  });
}

async function assertNoConflicts(
  tx: Pick<typeof prisma, "bookingHold" | "booking">,
  params: {
    branchId: number;
    staffId: number;
    startAtUtc: Date;
    endAtUtc: Date;
    bufferMin: number;
    excludeHoldId?: number;
  }
) {
  const { startAtUtc, endAtUtc, bufferMin, branchId, staffId, excludeHoldId } = params;
  const window = expandWithBuffer({ startAtUtc, endAtUtc }, bufferMin);
  const now = new Date();

  const overlappingHold = await tx.bookingHold.findFirst({
    where: {
      branchId,
      staffId,
      id: excludeHoldId ? { not: excludeHoldId } : undefined,
      expiresAtUtc: { gt: now },
      startAtUtc: { lt: new Date(window.end) },
      endAtUtc: { gt: new Date(window.start) }
    }
  });

  if (overlappingHold) {
    throw new BookingError("Slot je právě držený jinou objednávkou", 409);
  }

  const overlappingBooking = await tx.booking.findFirst({
    where: {
      branchId,
      staffId,
      status: "CONFIRMED",
      startAtUtc: { lt: new Date(window.end) },
      endAtUtc: { gt: new Date(window.start) }
    }
  });

  if (overlappingBooking) {
    throw new BookingError("Slot už byl zabookovaný", 409);
  }
}

function ensureStartWithinRange(startAtUtc: Date, timezone: string, maxDaysAhead: number) {
  const localTarget = format(fromUtc(startAtUtc, timezone), "yyyy-MM-dd");
  const localToday = format(fromUtc(new Date(), timezone), "yyyy-MM-dd");
  const daysAhead = differenceInCalendarDays(parseISO(localTarget), parseISO(localToday));

  if (daysAhead < 0) {
    throw new BookingError("Rezervace musí být v budoucnu", 400);
  }

  if (daysAhead > maxDaysAhead) {
    throw new BookingError(
      `Datum musí být do ${maxDaysAhead} dní dopředu`,
      400
    );
  }

  return localTarget;
}

function ensureValidStart(startAtUtc: string) {
  const parsed = new Date(startAtUtc);
  if (Number.isNaN(parsed.getTime())) {
    throw new BookingError("startAtUtc musí být platný ISO čas", 400);
  }

  return parsed;
}

export async function createBookingHold(
  params: CreateHoldParams
): Promise<SerializedHold> {
  const startAt = ensureValidStart(params.startAtUtc);

  const branch = await prisma.branch.findUnique({
    where: { id: params.branchId }
  });

  if (!branch) {
    throw new BookingError("Pobočka neexistuje", 404);
  }

  ensureStartWithinRange(startAt, branch.timezone, branch.maxDaysAhead);

  const branchService = await prisma.branchService.findUnique({
    where: {
      branchId_serviceId: {
        branchId: params.branchId,
        serviceId: params.serviceId
      }
    },
    include: { service: true }
  });

  if (!branchService || !branchService.active || !branchService.service.active) {
    throw new BookingError("Služba není na pobočce dostupná", 404);
  }

  const staff = await prisma.staff.findUnique({
    where: { id: params.staffId },
    include: {
      services: {
        where: { serviceId: params.serviceId, active: true },
        select: { serviceId: true }
      }
    }
  });

  if (!staff || !staff.active || staff.branchId !== params.branchId) {
    throw new BookingError("Barber není na pobočce aktivní", 404);
  }

  if (staff.services.length === 0) {
    throw new BookingError("Barber neumí zvolenou službu", 400);
  }

  const endAt = addMinutes(
    startAt,
    Math.max(1, branchService.service.durationMin)
  );

  const localDate = format(fromUtc(startAt, branch.timezone), "yyyy-MM-dd");

  try {
    const slots = await listAvailableSlots({
      branchId: params.branchId,
      serviceId: params.serviceId,
      staffId: params.staffId,
      date: localDate
    });

    const matching = slots.find(
      (slot) =>
        slot.staffId === params.staffId &&
        slot.startAtUtc === startAt.toISOString()
    );

    if (!matching) {
      throw new BookingError("Slot už není volný", 409);
    }
  } catch (error) {
    if (error instanceof AvailabilityError || error instanceof BookingError) {
      throw error;
    }

    throw new BookingError("Nelze ověřit dostupnost slotu", 500);
  }

  const hold = await prisma.$transaction(async (tx) => {
    await tx.bookingHold.deleteMany({ where: { expiresAtUtc: { lte: new Date() } } });

    await assertNoConflicts(tx, {
      branchId: params.branchId,
      staffId: params.staffId,
      startAtUtc: startAt,
      endAtUtc: endAt,
      bufferMin: branch.bookingBufferMin
    });

    return tx.bookingHold.create({
      data: {
        branchId: params.branchId,
        staffId: params.staffId,
        serviceId: params.serviceId,
        startAtUtc: startAt,
        endAtUtc: endAt,
        clientFingerprint: params.clientFingerprint,
        expiresAtUtc: addMinutes(new Date(), HOLD_EXPIRATION_MIN)
      }
    });
  });

  return {
    id: hold.id,
    branchId: hold.branchId,
    staffId: hold.staffId,
    serviceId: hold.serviceId,
    startAtUtc: hold.startAtUtc.toISOString(),
    endAtUtc: hold.endAtUtc.toISOString(),
    expiresAtUtc: hold.expiresAtUtc.toISOString()
  };
}

export async function confirmBooking(
  params: ConfirmBookingParams
): Promise<SerializedBooking> {
  if (params.customerName.trim().length < MIN_NAME_LENGTH) {
    throw new BookingError("customerName je povinné", 400);
  }

  const hold = await prisma.bookingHold.findUnique({
    where: { id: params.holdId },
    include: {
      branch: true,
      staff: true,
      service: true
    }
  });

  if (!hold) {
    throw new BookingError("Hold neexistuje", 404);
  }

  if (hold.expiresAtUtc <= new Date()) {
    throw new BookingError("Hold už expiroval", 410);
  }

  const booking = await prisma.$transaction(async (tx) => {
    await assertNoConflicts(tx, {
      branchId: hold.branchId,
      staffId: hold.staffId,
      startAtUtc: hold.startAtUtc,
      endAtUtc: hold.endAtUtc,
      bufferMin: hold.branch.bookingBufferMin,
      excludeHoldId: hold.id
    });

    const created = await tx.booking.create({
      data: {
        branchId: hold.branchId,
        staffId: hold.staffId,
        serviceId: hold.serviceId,
        startAtUtc: hold.startAtUtc,
        endAtUtc: hold.endAtUtc,
        customerName: params.customerName.trim(),
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        note: params.note,
        status: "CONFIRMED"
      }
    });

    await tx.bookingHold.delete({ where: { id: hold.id } });
    return created;
  });

  void sendBookingConfirmationEmail({
    to: params.customerEmail,
    customerName: params.customerName,
    branchName: hold.branch.name,
    serviceName: hold.service.name,
    staffName: hold.staff.name,
    timezone: hold.branch.timezone,
    startAtUtc: booking.startAtUtc
  });

  return {
    id: booking.id,
    branchId: booking.branchId,
    staffId: booking.staffId,
    serviceId: booking.serviceId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    note: booking.note,
    startAtUtc: booking.startAtUtc.toISOString(),
    endAtUtc: booking.endAtUtc.toISOString(),
    status: booking.status
  };
}

async function sendBookingConfirmationEmail(params: {
  to?: string | null;
  customerName: string;
  branchName: string;
  serviceName: string;
  staffName: string;
  timezone: string;
  startAtUtc: Date;
}) {
  if (!params.to) {
    return;
  }

  const startLocal = fromUtc(params.startAtUtc, params.timezone);
  const startFormatted = format(startLocal, "yyyy-MM-dd HH:mm");

  if (!resendClient) {
    console.info("Confirmation email skipped (RESEND_API_KEY není nastavený)");
    return;
  }

  try {
    await resendClient.emails.send({
      from: "Barber Reservations <noreply@barber.local>",
      to: params.to,
      subject: `Potvrzení rezervace — ${params.branchName}`,
      text: [
        `Ahoj ${params.customerName},`,
        "",
        `Tvá rezervace je potvrzená.`,
        `Služba: ${params.serviceName}`,
        `Barber: ${params.staffName}`,
        `Termín: ${startFormatted} (${params.timezone})`,
        "",
        "Pokud potřebuješ termín změnit, kontaktuj prosím pobočku."
      ].join("\n")
    });
  } catch (error) {
    console.error("Nepodařilo se odeslat potvrzovací email", error);
  }
}
