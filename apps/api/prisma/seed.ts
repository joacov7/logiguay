import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const dadoresCompany = await prisma.company.upsert({
    where: { cuit: '20-12345678-9' },
    update: {},
    create: {
      name: 'Empresa Dadora SA',
      cuit: '20-12345678-9',
      address: 'Av. Corrientes 1234, Buenos Aires',
      country: 'AR',
      planType: 'PRO',
    },
  });

  const transportCompany = await prisma.company.upsert({
    where: { cuit: '30-98765432-1' },
    update: {},
    create: {
      name: 'Transporte Rápido SRL',
      cuit: '30-98765432-1',
      address: 'Ruta 9 km 45, Córdoba',
      country: 'AR',
      planType: 'EMPRESA',
    },
  });

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@logiguay.com' },
    update: {},
    create: {
      email: 'admin@logiguay.com',
      password: adminPassword,
      role: 'ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+54911234567',
    },
  });

  const dadorPassword = await bcrypt.hash('Test123!', 10);
  await prisma.user.upsert({
    where: { email: 'dador@logiguay.com' },
    update: {},
    create: {
      email: 'dador@logiguay.com',
      password: dadorPassword,
      role: 'DADOR',
      firstName: 'Juan',
      lastName: 'García',
      phone: '+54911111111',
      companyUsers: {
        create: { companyId: dadoresCompany.id, role: 'DADOR' },
      },
    },
  });

  const transportPassword = await bcrypt.hash('Test123!', 10);
  await prisma.user.upsert({
    where: { email: 'transportista@logiguay.com' },
    update: {},
    create: {
      email: 'transportista@logiguay.com',
      password: transportPassword,
      role: 'TRANSPORTISTA',
      firstName: 'Carlos',
      lastName: 'López',
      phone: '+54922222222',
      companyUsers: {
        create: { companyId: transportCompany.id, role: 'TRANSPORTISTA' },
      },
    },
  });

  const choferPassword = await bcrypt.hash('Test123!', 10);
  const choferUser = await prisma.user.upsert({
    where: { email: 'chofer@logiguay.com' },
    update: {},
    create: {
      email: 'chofer@logiguay.com',
      password: choferPassword,
      role: 'CHOFER',
      firstName: 'Pedro',
      lastName: 'Martínez',
      phone: '+54933333333',
      companyUsers: {
        create: { companyId: transportCompany.id, role: 'CHOFER' },
      },
    },
  });

  const existingDriver = await prisma.driver.findFirst({ where: { userId: choferUser.id } });
  if (!existingDriver) {
    await prisma.driver.create({
      data: {
        userId: choferUser.id,
        companyId: transportCompany.id,
        licenseNumber: 'LIC-001',
        licenseExpiry: new Date('2027-12-31'),
        status: 'ACTIVO',
      },
    });
  }

  await prisma.vehicle.upsert({
    where: { plate: 'ABC123' },
    update: {},
    create: {
      companyId: transportCompany.id,
      type: 'CAMION',
      plate: 'ABC123',
      brand: 'Mercedes-Benz',
      model: 'Actros 2651',
      year: 2021,
      capacityTons: 28,
      capacityM3: 90,
      status: 'ACTIVO',
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'XYZ789' },
    update: {},
    create: {
      companyId: transportCompany.id,
      type: 'SEMIRREMOLQUE',
      plate: 'XYZ789',
      brand: 'Scania',
      model: 'R 450',
      year: 2022,
      capacityTons: 30,
      capacityM3: 95,
      status: 'ACTIVO',
    },
  });

  const now = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  await prisma.subscription.upsert({
    where: { id: 'seed-sub-transport-1' },
    update: {},
    create: {
      id: 'seed-sub-transport-1',
      companyId: transportCompany.id,
      plan: 'EMPRESA',
      status: 'ACTIVA',
      startDate: now,
      endDate,
      amount: 9900,
    },
  });

  console.log('\nSeed completado!');
  console.log('  Admin:          admin@logiguay.com         / Admin123!');
  console.log('  Dador:          dador@logiguay.com         / Test123!');
  console.log('  Transportista:  transportista@logiguay.com / Test123!');
  console.log('  Chofer:         chofer@logiguay.com         / Test123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
