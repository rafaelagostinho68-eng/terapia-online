import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await prisma.admin.upsert({
    where: { email: "admin@terapia.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@terapia.com",
      password: hashedPassword,
    },
  });

  const slots = [];
  const today = startOfDay(new Date());

  for (let day = 1; day <= 30; day++) {
    const date = addDays(today, day);
    const dayOfWeek = date.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const hours = [9, 10, 11, 14, 15, 16, 17];

      for (const hour of hours) {
        const startTime = setMinutes(setHours(date, hour), 0);
        const endTime = setMinutes(setHours(date, hour + 1), 0);

        slots.push({
          date,
          startTime,
          endTime,
          duration: 60,
          isActive: true,
        });
      }
    }
  }

  await prisma.availableSlot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  console.log("✅ Seed concluído!");
  console.log("👤 Admin: admin@terapia.com / admin123");
  console.log(`📅 ${slots.length} horários criados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());