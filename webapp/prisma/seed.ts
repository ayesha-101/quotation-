import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword, generateTempPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const existingAdminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (existingAdminCount > 0) {
    console.log(
      `Skipping seed — ${existingAdminCount} Admin account(s) already exist.`
    );
    return;
  }

  const email =
    process.env.SEED_ADMIN_EMAIL || "admin@bmtc-jih.local";
  const name = process.env.SEED_ADMIN_NAME || "Admin";
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.create({
    data: { name, email, role: "ADMIN", passwordHash },
  });

  console.log("\n=========================================");
  console.log(" Initial Admin account created");
  console.log("=========================================");
  console.log(` Email:    ${email}`);
  console.log(` Password: ${tempPassword}`);
  console.log("=========================================");
  console.log(
    " Sign in and you'll be asked to set a real password immediately."
  );
  console.log(" This password is shown only once — it is not stored anywhere.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
