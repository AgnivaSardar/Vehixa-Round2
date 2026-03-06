const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for existing vehicles...\n');

  // Check if any vehicles exist
  let vehicles = await prisma.vehicle.findMany({
    select: {
      vehicleId: true,
      vehicleNumber: true,
      model: true,
      manufacturer: true,
      userId: true,
    },
    take: 10,
  });

  if (vehicles.length > 0) {
    console.log('✅ Found existing vehicles:\n');
    vehicles.forEach((v, index) => {
      console.log(`${index + 1}. Vehicle ID: ${v.vehicleId}`);
      console.log(`   Model: ${v.manufacturer || 'N/A'} ${v.model || 'N/A'}`);
      console.log(`   Number: ${v.vehicleNumber || 'N/A'}`);
      console.log(`   User ID: ${v.userId}`);
      console.log('');
    });
    console.log(`\n📋 Use this vehicleId in your API requests: ${vehicles[0].vehicleId}`);
    return;
  }

  console.log('⚠️  No vehicles found. Creating a test vehicle...\n');

  // Check if any users exist
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('Creating a test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password_here',
        name: 'Test User',
        role: 'USER',
      },
    });
    console.log(`✅ Created user: ${user.userId}\n`);
  }

  // Create a test vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      userId: user.userId,
      vehicleNumber: 'TEST-001',
      model: 'Test Model',
      manufacturer: 'Test Manufacturer',
      year: 2024,
      fuelType: 'PETROL',
      vehicleType: 'SEDAN',
      engineType: 'INLINE',
    },
  });

  console.log('✅ Created test vehicle:\n');
  console.log(`   Vehicle ID: ${vehicle.vehicleId}`);
  console.log(`   Model: ${vehicle.manufacturer} ${vehicle.model}`);
  console.log(`   Number: ${vehicle.vehicleNumber}`);
  console.log(`   User ID: ${vehicle.userId}`);
  console.log(`\n📋 Use this vehicleId in your API requests: ${vehicle.vehicleId}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
