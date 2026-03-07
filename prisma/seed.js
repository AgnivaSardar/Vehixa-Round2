const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  const seedPassword = 'Vehixa@123';

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.driverLocation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.preventiveSchedule.deleteMany();
  await prisma.vehicleComponent.deleteMany();
  await prisma.serviceVendor.deleteMany();
  await prisma.complianceRecord.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.maintenanceOrder.deleteMany();
  await prisma.dispatchRequest.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.healthPrediction.deleteMany();
  await prisma.telemetry.deleteMany();
  await prisma.telemtery2.deleteMany();
  await prisma.vehicleApiKey.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.user.deleteMany();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  // Create Users
  console.log('👥 Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@vehixa.com',
      name: 'Fleet Administrator',
      password: hashedPassword,
      phone: '+91-9876543210',
      role: 'ADMIN',
      fleetRole: 'ADMIN',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@vehixa.com',
      name: 'Rajesh Kumar',
      password: hashedPassword,
      phone: '+91-9876543211',
      role: 'USER',
      fleetRole: 'MANAGER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@vehixa.com',
      name: 'Priya Sharma',
      password: hashedPassword,
      phone: '+91-9876543212',
      role: 'USER',
      fleetRole: 'MANAGER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const driver1 = await prisma.user.create({
    data: {
      email: 'driver1@vehixa.com',
      name: 'Amit Singh',
      password: hashedPassword,
      phone: '+91-9876543213',
      role: 'USER',
      fleetRole: 'DRIVER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      email: 'driver2@vehixa.com',
      name: 'Suresh Patel',
      password: hashedPassword,
      phone: '+91-9876543214',
      role: 'USER',
      fleetRole: 'DRIVER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const driver3 = await prisma.user.create({
    data: {
      email: 'driver3@vehixa.com',
      name: 'Mohammad Ali',
      password: hashedPassword,
      phone: '+91-9876543215',
      role: 'USER',
      fleetRole: 'DRIVER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  const driver4 = await prisma.user.create({
    data: {
      email: 'driver4@vehixa.com',
      name: 'Ramesh Yadav',
      password: hashedPassword,
      phone: '+91-9876543216',
      role: 'USER',
      fleetRole: 'DRIVER',
      companyName: 'Vehixa Transport Ltd',
      isApproved: true,
      isActive: true,
      isVerified: true,
    },
  });

  // Create Vehicles
  console.log('🚚 Creating vehicles...');
  const vehicle1 = await prisma.vehicle.create({
    data: {
      userId: adminUser.userId,
      vehicleNumber: 'MH-12-AB-1234',
      manufacturer: 'Tata',
      model: 'Ace Gold',
      year: 2023,
      vin: 'TATA1234567890ABC',
      engineNumber: 'ENG-TT-1234',
      vehicleType: 'PICKUP_TRUCK',
      engineType: 'INLINE',
      fuelType: 'DIESEL',
      status: 'ACTIVE',
      fuelLevel: 75,
      currentLocation: 'Mumbai Warehouse',
      odometer: 45000,
      rcExpiryDate: new Date('2027-06-15'),
      registrationDate: new Date('2023-01-15'),
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      userId: adminUser.userId,
      vehicleNumber: 'MH-12-CD-5678',
      manufacturer: 'Ashok Leyland',
      model: 'Dost+',
      year: 2022,
      vin: 'ASHL567890EFGHIJK',
      engineNumber: 'ENG-AL-5678',
      vehicleType: 'LIGHT_TRUCK',
      engineType: 'INLINE',
      fuelType: 'DIESEL',
      status: 'ACTIVE',
      fuelLevel: 60,
      currentLocation: 'Pune Hub',
      odometer: 67000,
      rcExpiryDate: new Date('2027-03-20'),
      registrationDate: new Date('2022-03-20'),
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      userId: adminUser.userId,
      vehicleNumber: 'GJ-01-EF-9012',
      manufacturer: 'Mahindra',
      model: 'Bolero Pickup',
      year: 2023,
      vin: 'MAHI901234LMNOPQR',
      engineNumber: 'ENG-MM-9012',
      vehicleType: 'PICKUP_TRUCK',
      engineType: 'INLINE',
      fuelType: 'DIESEL',
      status: 'UNDER_MAINTENANCE',
      fuelLevel: 30,
      currentLocation: 'Ahmedabad Service Center',
      odometer: 32000,
      rcExpiryDate: new Date('2028-01-10'),
      registrationDate: new Date('2023-01-10'),
    },
  });

  const vehicle4 = await prisma.vehicle.create({
    data: {
      userId: adminUser.userId,
      vehicleNumber: 'DL-3C-GH-3456',
      manufacturer: 'Tata',
      model: 'Ultra T7',
      year: 2021,
      vin: 'TATA345678STUVWXY',
      engineNumber: 'ENG-TT-3456',
      vehicleType: 'HEAVY_TRUCK',
      engineType: 'INLINE',
      fuelType: 'DIESEL',
      status: 'ACTIVE',
      fuelLevel: 85,
      currentLocation: 'Delhi Distribution Center',
      odometer: 125000,
      rcExpiryDate: new Date('2026-09-05'),
      registrationDate: new Date('2021-09-05'),
    },
  });

  const vehicle5 = await prisma.vehicle.create({
    data: {
      userId: adminUser.userId,
      vehicleNumber: 'KA-05-IJ-7890',
      manufacturer: 'Eicher',
      model: 'Pro 2049',
      year: 2024,
      vin: 'EICH789012ZABCDEF',
      engineNumber: 'ENG-EI-7890',
      vehicleType: 'LIGHT_TRUCK',
      engineType: 'INLINE',
      fuelType: 'DIESEL',
      status: 'ACTIVE',
      fuelLevel: 90,
      currentLocation: 'Bangalore Tech Park',
      odometer: 8500,
      rcExpiryDate: new Date('2029-02-20'),
      registrationDate: new Date('2024-02-20'),
    },
  });

  // Create Insurance Policies
  console.log('🛡️ Creating insurance policies...');
  await prisma.insurancePolicy.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      provider: 'HDFC ERGO',
      policyNumber: 'HDFC-2024-001234',
      startDate: new Date('2024-01-15'),
      expiryDate: new Date('2025-01-14'),
      documentUrl: 'https://example.com/insurance/hdfc-001234.pdf',
    },
  });

  await prisma.insurancePolicy.create({
    data: {
      vehicleId: vehicle2.vehicleId,
      provider: 'ICICI Lombard',
      policyNumber: 'ICICI-2023-567890',
      startDate: new Date('2023-03-20'),
      expiryDate: new Date('2025-03-19'),
      documentUrl: 'https://example.com/insurance/icici-567890.pdf',
    },
  });

  await prisma.insurancePolicy.create({
    data: {
      vehicleId: vehicle3.vehicleId,
      provider: 'Bajaj Allianz',
      policyNumber: 'BAJAJ-2024-901234',
      startDate: new Date('2024-01-10'),
      expiryDate: new Date('2026-04-10'), // Expiring within 30 days
      documentUrl: 'https://example.com/insurance/bajaj-901234.pdf',
    },
  });

  await prisma.insurancePolicy.create({
    data: {
      vehicleId: vehicle4.vehicleId,
      provider: 'National Insurance',
      policyNumber: 'NAT-2023-345678',
      startDate: new Date('2023-09-05'),
      expiryDate: new Date('2026-03-15'), // Expiring within 7 days (critical)
      documentUrl: 'https://example.com/insurance/nat-345678.pdf',
    },
  });

  await prisma.insurancePolicy.create({
    data: {
      vehicleId: vehicle5.vehicleId,
      provider: 'Reliance General',
      policyNumber: 'REL-2024-789012',
      startDate: new Date('2024-02-20'),
      expiryDate: new Date('2027-02-19'),
      documentUrl: 'https://example.com/insurance/rel-789012.pdf',
    },
  });

  // Create Driver Profiles
  console.log('👨‍✈️ Creating driver profiles...');
  const driverProfile1 = await prisma.driverProfile.create({
    data: {
      userId: driver1.userId,
      phone: '+91-9876543213',
      licenseNumber: 'DL-123456789012',
      licenseType: 'HGMV',
      licenseExpiry: new Date('2027-05-15'),
      safetyScore: 92,
      milesThisMonth: 2150.5,
      totalIncidents: 1,
      onTimeRate: 95,
      yearsExperience: 8,
      assignedVehicleId: vehicle1.vehicleId,
      status: 'AVAILABLE',
      aadharNumber: '1234-5678-9012',
      medicalCertExpiry: new Date('2026-12-31'),
      address: 'Flat 203, Shivaji Nagar, Mumbai - 400016',
    },
  });

  const driverProfile2 = await prisma.driverProfile.create({
    data: {
      userId: driver2.userId,
      phone: '+91-9876543214',
      licenseNumber: 'DL-234567890123',
      licenseType: 'HGMV',
      licenseExpiry: new Date('2028-03-20'),
      safetyScore: 88,
      milesThisMonth: 1890.0,
      totalIncidents: 2,
      onTimeRate: 91,
      yearsExperience: 12,
      assignedVehicleId: vehicle2.vehicleId,
      status: 'ON_TRIP',
      aadharNumber: '2345-6789-0123',
      medicalCertExpiry: new Date('2027-06-30'),
      address: 'House 45, Kothrud, Pune - 411038',
    },
  });

  const driverProfile3 = await prisma.driverProfile.create({
    data: {
      userId: driver3.userId,
      phone: '+91-9876543215',
      licenseNumber: 'DL-345678901234',
      licenseType: 'HGMV',
      licenseExpiry: new Date('2026-08-10'),
      safetyScore: 96,
      milesThisMonth: 2420.3,
      totalIncidents: 0,
      onTimeRate: 98,
      yearsExperience: 5,
      assignedVehicleId: vehicle4.vehicleId,
      status: 'AVAILABLE',
      aadharNumber: '3456-7890-1234',
      medicalCertExpiry: new Date('2027-02-28'),
      address: 'B-12, Vasant Kunj, New Delhi - 110070',
    },
  });

  const driverProfile4 = await prisma.driverProfile.create({
    data: {
      userId: driver4.userId,
      phone: '+91-9876543216',
      licenseNumber: 'DL-456789012345',
      licenseType: 'HGMV',
      licenseExpiry: new Date('2027-11-25'),
      safetyScore: 85,
      milesThisMonth: 1650.8,
      totalIncidents: 3,
      onTimeRate: 87,
      yearsExperience: 15,
      assignedVehicleId: vehicle5.vehicleId,
      status: 'AVAILABLE',
      aadharNumber: '4567-8901-2345',
      medicalCertExpiry: new Date('2026-09-30'),
      address: '301, HSR Layout, Bangalore - 560102',
    },
  });

  // Create Dispatch Requests
  console.log('📦 Creating dispatch requests...');
  await prisma.dispatchRequest.create({
    data: {
      ticketNumber: 'REQ-1001',
      origin: 'Mumbai Warehouse',
      destination: 'Pune Distribution Center',
      cargoType: 'Electronics',
      cargoWeight: '2.5 Tonnes',
      priority: 'HIGH',
      status: 'ACTIVE',
      driverId: driver2.userId,
      vehicleId: vehicle2.vehicleId,
      progressPct: 65,
      eta: '2 hours',
      speed: 75.5,
      createdById: manager1.userId,
    },
  });

  await prisma.dispatchRequest.create({
    data: {
      ticketNumber: 'REQ-1002',
      origin: 'Delhi Distribution Center',
      destination: 'Jaipur Hub',
      cargoType: 'Pharmaceuticals',
      cargoWeight: '1.8 Tonnes',
      priority: 'STANDARD',
      status: 'PENDING',
      driverId: driver3.userId,
      vehicleId: vehicle4.vehicleId,
      progressPct: 0,
      eta: '5 hours',
      speed: 0,
      createdById: manager2.userId,
    },
  });

  await prisma.dispatchRequest.create({
    data: {
      ticketNumber: 'REQ-1003',
      origin: 'Bangalore Tech Park',
      destination: 'Chennai Warehouse',
      cargoType: 'Textiles',
      cargoWeight: '3.2 Tonnes',
      priority: 'STANDARD',
      status: 'COMPLETED',
      driverId: driver4.userId,
      vehicleId: vehicle5.vehicleId,
      progressPct: 100,
      eta: 'Arrived',
      speed: 0,
      createdById: manager1.userId,
    },
  });

  await prisma.dispatchRequest.create({
    data: {
      ticketNumber: 'REQ-1004',
      origin: 'Mumbai Warehouse',
      destination: 'Nashik Factory',
      cargoType: 'Industrial Parts',
      cargoWeight: '1.5 Tonnes',
      priority: 'HIGH',
      status: 'PENDING',
      progressPct: 0,
      createdById: adminUser.userId,
    },
  });

  // Create Maintenance Orders
  console.log('🔧 Creating maintenance orders...');
  await prisma.maintenanceOrder.create({
    data: {
      vehicleId: vehicle3.vehicleId,
      title: 'Brake System Overhaul',
      description: 'Complete brake pad replacement and brake fluid flush required',
      priority: 'HIGH',
      status: 'IN_SERVICE',
      orderType: 'CORRECTIVE',
      mechanicName: 'Ganesh Patil',
      scheduledDate: new Date('2026-03-05'),
      estimatedCost: 18500,
      odometerReading: 32000,
      etaParts: '1 Day for brake pads',
    },
  });

  await prisma.maintenanceOrder.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      title: 'Routine Oil Change',
      description: 'Standard 10,000 km service - oil change and filter replacement',
      priority: 'MEDIUM',
      status: 'SCHEDULED',
      orderType: 'PROACTIVE',
      mechanicName: 'Sunil Kadam',
      scheduledDate: new Date('2026-03-15'),
      estimatedCost: 4500,
      odometerReading: 45000,
    },
  });

  await prisma.maintenanceOrder.create({
    data: {
      vehicleId: vehicle2.vehicleId,
      title: 'Tire Rotation and Alignment',
      description: 'Rotate tires and check wheel alignment',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      orderType: 'PROACTIVE',
      mechanicName: 'Ravi Kumar',
      scheduledDate: new Date('2026-02-20'),
      completedDate: new Date('2026-02-21'),
      estimatedCost: 3200,
      actualCost: 3000,
      odometerReading: 67000,
    },
  });

  await prisma.maintenanceOrder.create({
    data: {
      vehicleId: vehicle4.vehicleId,
      title: 'Engine Diagnostics',
      description: 'Check engine light on - need full diagnostic scan',
      priority: 'HIGH',
      status: 'AWAITING_PARTS',
      orderType: 'CORRECTIVE',
      mechanicName: 'Amit Verma',
      scheduledDate: new Date('2026-03-08'),
      estimatedCost: 12000,
      odometerReading: 125000,
      etaParts: '3 Days for O2 sensor',
    },
  });

  await prisma.maintenanceOrder.create({
    data: {
      vehicleId: vehicle5.vehicleId,
      title: '5000 km Service',
      description: 'First service for new vehicle - general checkup',
      priority: 'LOW',
      status: 'READY',
      orderType: 'PROACTIVE',
      mechanicName: 'Prakash Desai',
      scheduledDate: new Date('2026-03-12'),
      estimatedCost: 2800,
      odometerReading: 8500,
    },
  });

  // Create Support Tickets
  console.log('🎫 Creating support tickets...');
  await prisma.supportTicket.create({
    data: {
      driverId: driver1.userId,
      category: 'VEHICLE_ISSUE',
      subject: 'AC not working properly',
      description: 'The air conditioning system is blowing warm air instead of cold',
      status: 'OPEN',
      priority: 'MEDIUM',
    },
  });

  await prisma.supportTicket.create({
    data: {
      driverId: driver2.userId,
      category: 'TRIP_ISSUE',
      subject: 'Incorrect delivery address',
      description: 'The delivery address on ticket REQ-1001 needs to be updated',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });

  await prisma.supportTicket.create({
    data: {
      driverId: driver3.userId,
      category: 'DOCUMENT_HELP',
      subject: 'Need insurance copy',
      description: 'Please provide a copy of the vehicle insurance certificate',
      status: 'RESOLVED',
      priority: 'LOW',
    },
  });

  await prisma.supportTicket.create({
    data: {
      driverId: driver4.userId,
      category: 'EMERGENCY_SOS',
      subject: 'Vehicle breakdown on highway',
      description: 'Engine overheating on NH-4 near Tumkur. Need immediate assistance',
      status: 'CLOSED',
      priority: 'HIGH',
    },
  });

  // Create Compliance Records
  console.log('📋 Creating compliance records...');
  await prisma.complianceRecord.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      type: 'POLLUTION_CERTIFICATE',
      issueDate: new Date('2025-06-15'),
      expiryDate: new Date('2026-06-14'),
      documentUrl: 'https://example.com/compliance/puc-1234.pdf',
    },
  });

  await prisma.complianceRecord.create({
    data: {
      vehicleId: vehicle2.vehicleId,
      type: 'FITNESS_CERTIFICATE',
      issueDate: new Date('2024-03-20'),
      expiryDate: new Date('2027-03-19'),
      documentUrl: 'https://example.com/compliance/fitness-5678.pdf',
    },
  });

  await prisma.complianceRecord.create({
    data: {
      vehicleId: vehicle3.vehicleId,
      type: 'NATIONAL_PERMIT',
      issueDate: new Date('2024-01-10'),
      expiryDate: new Date('2029-01-09'),
      documentUrl: 'https://example.com/compliance/permit-9012.pdf',
    },
  });

  await prisma.complianceRecord.create({
    data: {
      vehicleId: vehicle4.vehicleId,
      type: 'ROAD_TAX',
      issueDate: new Date('2025-09-05'),
      expiryDate: new Date('2026-09-04'),
      documentUrl: 'https://example.com/compliance/tax-3456.pdf',
    },
  });

  // Create Service Vendors
  console.log('🏢 Creating service vendors...');
  await prisma.serviceVendor.create({
    data: {
      name: 'Mumbai Auto Services',
      serviceType: 'General Maintenance',
      phone: '+91-22-12345678',
      email: 'contact@mumbaiautocs.com',
      address: 'Shop 12, Andheri East, Mumbai - 400069',
    },
  });

  await prisma.serviceVendor.create({
    data: {
      name: 'Pune Tire Center',
      serviceType: 'Tire Services',
      phone: '+91-20-87654321',
      email: 'info@punetirecenter.com',
      address: '45, Baner Road, Pune - 411045',
    },
  });

  await prisma.serviceVendor.create({
    data: {
      name: 'Delhi Engine Specialists',
      serviceType: 'Engine Repair',
      phone: '+91-11-23456789',
      email: 'service@delhiengine.com',
      address: 'B-15, Industrial Area, New Delhi - 110020',
    },
  });

  // Create Vehicle Components
  console.log('⚙️ Creating vehicle components...');
  await prisma.vehicleComponent.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      componentName: 'Engine Oil',
      lastReplacementDate: new Date('2025-12-10'),
      nextReplacementDue: new Date('2026-04-10'),
      currentCondition: 'Good',
    },
  });

  await prisma.vehicleComponent.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      componentName: 'Brake Pads',
      lastReplacementDate: new Date('2025-08-15'),
      nextReplacementDue: new Date('2026-08-15'),
      currentCondition: 'Fair',
    },
  });

  await prisma.vehicleComponent.create({
    data: {
      vehicleId: vehicle2.vehicleId,
      componentName: 'Air Filter',
      lastReplacementDate: new Date('2025-11-20'),
      nextReplacementDue: new Date('2026-05-20'),
      currentCondition: 'Good',
    },
  });

  await prisma.vehicleComponent.create({
    data: {
      vehicleId: vehicle3.vehicleId,
      componentName: 'Battery',
      lastReplacementDate: new Date('2024-01-10'),
      nextReplacementDue: new Date('2027-01-10'),
      currentCondition: 'Excellent',
    },
  });

  // Create Preventive Schedules
  console.log('📅 Creating preventive schedules...');
  await prisma.preventiveSchedule.create({
    data: {
      vehicleId: vehicle1.vehicleId,
      title: '50,000 km Major Service',
      description: 'Complete vehicle inspection and major service',
      scheduledDate: new Date('2026-04-20'),
      isCompleted: false,
    },
  });

  await prisma.preventiveSchedule.create({
    data: {
      vehicleId: vehicle2.vehicleId,
      title: 'Annual Safety Inspection',
      description: 'Mandatory annual safety and emissions inspection',
      scheduledDate: new Date('2026-03-20'),
      isCompleted: false,
    },
  });

  await prisma.preventiveSchedule.create({
    data: {
      vehicleId: vehicle5.vehicleId,
      title: 'New Vehicle 1-Month Checkup',
      description: 'First month inspection for new vehicle',
      scheduledDate: new Date('2026-03-20'),
      completedDate: new Date('2026-03-21'),
      isCompleted: true,
    },
  });

  // Create Audit Logs
  console.log('📝 Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: adminUser.userId,
      action: 'VEHICLE_CREATED',
      entityType: 'Vehicle',
      entityId: vehicle1.vehicleId,
      severity: 'INFO',
      details: { vehicleNumber: 'MH-12-AB-1234', action: 'Created new vehicle' },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: manager1.userId,
      action: 'DISPATCH_CREATED',
      entityType: 'DispatchRequest',
      severity: 'INFO',
      details: { ticketNumber: 'REQ-1001', priority: 'HIGH' },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: manager2.userId,
      action: 'MAINTENANCE_SCHEDULED',
      entityType: 'MaintenanceOrder',
      severity: 'WARNING',
      details: { vehicleId: vehicle3.vehicleId, priority: 'HIGH', issue: 'Brake System' },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`
📊 Summary:
- 7 Users (1 admin, 2 managers, 4 drivers)
- 5 Vehicles
- 5 Insurance Policies
- 4 Driver Profiles
- 4 Dispatch Requests
- 5 Maintenance Orders
- 4 Support Tickets
- 4 Compliance Records
- 3 Service Vendors
- 4 Vehicle Components
- 3 Preventive Schedules
- 3 Audit Logs
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
