import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const branchInput = {
  slug: "praha-vinohrady",
  name: "Barber Praha Vinohrady",
  address: "Krásného z 12",
  city: "Praha",
  lat: 50.0848,
  lng: 14.4444,
  phone: "+420 123 456 789",
  email: "vinohrady@barber.cz",
  timezone: "Europe/Prague",
  bookingBufferMin: 10,
  slotStepMin: 5,
  maxDaysAhead: 60,
  allowPayOnSite: true,
  allowPayOnline: true
};

const servicesInput = [
  {
    name: "Classic Haircut",
    category: "Hair",
    durationMin: 35,
    description: "Precise scissor and clipper haircut tailored to your face shape.",
    priceCents: 7500
  },
  {
    name: "Beard Trim",
    category: "Beard",
    durationMin: 20,
    description: "Neat beard shaping and clean neckline for a sharp finish.",
    priceCents: 4200
  }
] as const;

const staffInput = {
  name: "Vojta Novák",
  avatarUrl: "https://images.example.com/vojta-profile.jpg",
  active: true
};

async function main() {
  const branch = await prisma.branch.upsert({
    where: { slug: branchInput.slug },
    create: branchInput,
    update: branchInput
  });

  const createdServices = [];

  for (const serviceData of servicesInput) {
    const { priceCents, ...serviceFields } = serviceData;

    const service = await prisma.service.upsert({
      where: { name: serviceFields.name },
      create: {
        ...serviceFields
      },
      update: {
        ...serviceFields
      }
    });

    createdServices.push({ service, priceCents });

    await prisma.branchService.upsert({
      where: {
        branchId_serviceId: {
          branchId: branch.id,
          serviceId: service.id
        }
      },
      create: {
        branchId: branch.id,
        serviceId: service.id,
        priceCents,
        active: true
      },
      update: {
        priceCents,
        active: true
      }
    });
  }

  const staff = await prisma.staff.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: staffInput.name
      }
    },
    create: {
      branchId: branch.id,
      ...staffInput
    },
    update: staffInput
  });

  await prisma.staffService.deleteMany({ where: { staffId: staff.id } });

  for (const { service } of createdServices) {
    await prisma.staffService.create({
      data: {
        staffId: staff.id,
        serviceId: service.id,
        active: true
      }
    });
  }

  await prisma.shift.deleteMany({ where: { staffId: staff.id } });
  await prisma.break.deleteMany({ where: { staffId: staff.id } });
  await prisma.timeOff.deleteMany({ where: { staffId: staff.id } });

  const shiftStart = new Date(Date.UTC(2025, 0, 15, 9, 0));
  const shiftEnd = new Date(Date.UTC(2025, 0, 15, 17, 0));
  await prisma.shift.create({
    data: {
      staffId: staff.id,
      branchId: branch.id,
      startAtUtc: shiftStart,
      endAtUtc: shiftEnd
    }
  });

  await prisma.break.create({
    data: {
      staffId: staff.id,
      branchId: branch.id,
      startAtUtc: new Date(Date.UTC(2025, 0, 15, 12, 0)),
      endAtUtc: new Date(Date.UTC(2025, 0, 15, 12, 30))
    }
  });

  await prisma.timeOff.create({
    data: {
      staffId: staff.id,
      startAtUtc: new Date(Date.UTC(2025, 0, 18, 0, 0)),
      endAtUtc: new Date(Date.UTC(2025, 0, 20, 0, 0)),
      reason: "Kancelářský den"
    }
  });
}

main()
  .catch((error) => {
    console.error("Seeder failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
