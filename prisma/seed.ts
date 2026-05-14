import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPhone(phone: string) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

async function main() {
  console.log("🌱 Seeding Clinomatic database...");

  // Create demo clinic
  const clinic = await prisma.clinic.upsert({
    where: { slug: "clinique-demo" },
    update: {},
    create: {
      name: "Clinique Demo",
      slug: "clinique-demo",
      phone: "0555000000",
      email: "demo@clinomatic.dz",
      address: "1 Rue de la Paix",
      city: "Alger",
      subscriptionPlan: "PRO",
      monthlyFee: 15000,
      workingHours: {
        mon: { start: "09:00", end: "18:00" },
        tue: { start: "09:00", end: "18:00" },
        wed: { start: "09:00", end: "18:00" },
        thu: { start: "09:00", end: "18:00" },
        fri: { start: "09:00", end: "17:00" },
        sat: { start: "09:00", end: "13:00" },
      },
    },
  });

  console.log(`✅ Clinic: ${clinic.name}`);

  // Create super admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinomatic.dz" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@clinomatic.dz",
      phone: "0555999001",
      role: "SUPER_ADMIN",
      password: "$2b$10$somehashedpassword", // admin123 — replace in prod
    },
  });

  // Create clinic owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@clinique-demo.dz" },
    update: {},
    create: {
      name: "Dr. Benali Karim",
      email: "owner@clinique-demo.dz",
      phone: "0555000001",
      role: "CLINIC_OWNER",
      clinicId: clinic.id,
      password: "$2b$10$somehashedpassword",
    },
  });

  // Create confirmation agent
  const agent = await prisma.user.upsert({
    where: { email: "agent@clinomatic.dz" },
    update: {},
    create: {
      name: "Fatima Zohra",
      email: "agent@clinomatic.dz",
      phone: "0555000002",
      role: "CONFIRMATION_AGENT",
      password: "$2b$10$somehashedpassword",
    },
  });

  console.log(`✅ Users: ${admin.name}, ${owner.name}, ${agent.name}`);

  // Create services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "service-consultation" },
      update: {},
      create: {
        id: "service-consultation",
        clinicId: clinic.id,
        name: "Consultation générale",
        nameAr: "استشارة عامة",
        price: 2000,
        duration: 30,
        color: "#0d9488",
      },
    }),
    prisma.service.upsert({
      where: { id: "service-radio" },
      update: {},
      create: {
        id: "service-radio",
        clinicId: clinic.id,
        name: "Radiographie",
        nameAr: "أشعة سينية",
        price: 3500,
        duration: 20,
        color: "#0891b2",
      },
    }),
    prisma.service.upsert({
      where: { id: "service-echo" },
      update: {},
      create: {
        id: "service-echo",
        clinicId: clinic.id,
        name: "Échographie",
        nameAr: "الموجات الفوق صوتية",
        price: 4000,
        duration: 40,
        color: "#7c3aed",
      },
    }),
  ]);

  console.log(`✅ Services: ${services.map((s) => s.name).join(", ")}`);

  // Create doctor
  const doctor = await prisma.doctor.upsert({
    where: { id: "doctor-1" },
    update: {},
    create: {
      id: "doctor-1",
      clinicId: clinic.id,
      name: "Benali Karim",
      specialty: "Médecine générale",
      phone: "0555000010",
      schedule: {
        mon: { start: "09:00", end: "17:00" },
        tue: { start: "09:00", end: "17:00" },
        wed: { start: "09:00", end: "17:00" },
        thu: { start: "09:00", end: "17:00" },
        fri: { start: "09:00", end: "15:00" },
      },
    },
  });

  // Create demo patients
  const patientData = [
    { name: "Ahmed Khelifi", phone: "0661000001", gender: "MALE", source: "instagram" },
    { name: "Nour Eddine Messad", phone: "0661000002", gender: "MALE", source: "facebook" },
    { name: "Yasmine Boudiaf", phone: "0661000003", gender: "FEMALE", source: "whatsapp" },
    { name: "Amina Cherif", phone: "0661000004", gender: "FEMALE", source: "referral" },
    { name: "Rachid Hakem", phone: "0661000005", gender: "MALE", source: "walk_in" },
  ];

  const patients = [];
  for (const p of patientData) {
    const patient = await prisma.patient.upsert({
      where: { clinicId_phone: { clinicId: clinic.id, phone: p.phone } },
      update: {},
      create: {
        clinicId: clinic.id,
        name: p.name,
        phone: p.phone,
        phoneHash: hashPhone(p.phone),
        gender: p.gender,
        source: p.source,
        address: "Alger",
      },
    });
    patients.push(patient);
  }

  console.log(`✅ Patients: ${patients.map((p) => p.name).join(", ")}`);

  // Create sample appointments
  const now = new Date();
  const appointmentData = [
    { patientIdx: 0, serviceIdx: 0, status: "PENDING", daysOffset: 1, hour: 9 },
    { patientIdx: 1, serviceIdx: 1, status: "CONFIRMED", daysOffset: 1, hour: 10 },
    { patientIdx: 2, serviceIdx: 2, status: "CONFIRMED", daysOffset: 1, hour: 11 },
    { patientIdx: 3, serviceIdx: 0, status: "PENDING", daysOffset: 2, hour: 9 },
    { patientIdx: 4, serviceIdx: 1, status: "ATTENDED", daysOffset: -1, hour: 14 },
  ];

  for (const apd of appointmentData) {
    const date = new Date(now);
    date.setDate(date.getDate() + apd.daysOffset);
    date.setHours(apd.hour, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patients[apd.patientIdx].id,
        doctorId: doctor.id,
        serviceId: services[apd.serviceIdx].id,
        date,
        duration: services[apd.serviceIdx].duration,
        price: services[apd.serviceIdx].price,
        status: apd.status as "PENDING" | "CONFIRMED" | "ATTENDED",
        source: patients[apd.patientIdx].source || "manual",
        attended: apd.status === "ATTENDED",
      },
    }).catch(() => {}); // Skip duplicates
  }

  console.log("✅ Sample appointments created");

  // WhatsApp config
  await prisma.whatsAppConfig.upsert({
    where: { clinicId: clinic.id },
    update: {},
    create: {
      clinicId: clinic.id,
      phoneNumber: "213555000000",
      autoReminder24h: true,
      autoReminder2h: true,
      autoFollowUp: true,
      confirmTemplate: "مرحبا {name}، نؤكد موعدك. رجاء الرد بـ *نعم* للتأكيد.",
    },
  });

  console.log("🎉 Seed complete!");
  console.log("\n--- DEMO CREDENTIALS ---");
  console.log("Super Admin:  admin@clinomatic.dz / admin123");
  console.log("Clinic Owner: owner@clinique-demo.dz / admin123");
  console.log("Agent:        agent@clinomatic.dz / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
