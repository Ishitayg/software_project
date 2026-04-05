const { sequelize, connectDB } = require('./config/database_pg');
const { User, Clinic } = require('./models');

async function seedDatabase() {
  try {
    console.log('Connecting to PostgreSQL...');
    await connectDB();
    console.log('✅ Connected to PostgreSQL');

    // Check if demo clinic exists
    let clinic = await Clinic.findOne({ where: { code: 'MAIN001' } });
    
    if (!clinic) {
      console.log('Creating demo clinic...');
      clinic = await Clinic.create({
        name: 'Main Clinic',
        code: 'MAIN001',
        phone: '+91-22-12345678',
        email: 'main@icoms.demo',
        addressStreet: '123 Healthcare Avenue',
        addressCity: 'Mumbai',
        addressState: 'Maharashtra',
        addressPostalCode: '400001',
        addressCountry: 'India',
        operatingHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '14:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        },
        isActive: true
      });
      console.log('✅ Demo clinic created');
    } else {
      console.log('✅ Demo clinic already exists');
    }

    // Demo users
    const demoUsers = [
      {
        username: 'admin',
        email: 'admin@demo.com',
        password: 'demo123',
        role: 'management',
        firstName: 'Admin',
        lastName: 'User',
        phone: '9876543210',
        permissions: ['all']
      },
      {
        username: 'doctor1',
        email: 'doctor@demo.com',
        password: 'demo123',
        role: 'doctor',
        firstName: 'John',
        lastName: 'Smith',
        phone: '9876543211',
        specialization: 'General Medicine',
        permissions: ['appointments.read', 'appointments.update', 'patients.read', 'patients.create', 'patients.update']
      },
      {
        username: 'frontdesk1',
        email: 'frontdesk@demo.com',
        password: 'demo123',
        role: 'front_desk',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '9876543212',
        permissions: ['appointments.read', 'appointments.create', 'appointments.update', 'patients.read', 'patients.create', 'patients.update', 'billing.read', 'billing.create']
      },
      {
        username: 'billing1',
        email: 'billing@demo.com',
        password: 'demo123',
        role: 'billing',
        firstName: 'Mike',
        lastName: 'Brown',
        phone: '9876543213',
        permissions: ['billing.read', 'billing.create', 'billing.update', 'insurance.read', 'insurance.create', 'insurance.update']
      },
      {
        username: 'insurance1',
        email: 'insurance@demo.com',
        password: 'demo123',
        role: 'insurance',
        firstName: 'Lisa',
        lastName: 'Davis',
        phone: '9876543214',
        permissions: ['insurance.read', 'insurance.create', 'insurance.update', 'billing.read']
      }
    ];

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (!existingUser) {
        console.log(`Creating user: ${userData.email}...`);
        
        await User.create({
          ...userData,
          clinicId: clinic.id
        });
        
        console.log(`✅ Created: ${userData.email} / ${userData.password}`);
      } else {
        console.log(`✅ User exists: ${userData.email}`);
      }
    }

    console.log('\n🎉 Demo users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin:      admin@demo.com / demo123');
    console.log('Doctor:     doctor@demo.com / demo123');
    console.log('Front Desk: frontdesk@demo.com / demo123');
    console.log('Billing:    billing@demo.com / demo123');
    console.log('Insurance:  insurance@demo.com / demo123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedDatabase();
