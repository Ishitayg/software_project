const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/icoms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Patient indexes
    await mongoose.connection.db.collection('patients').createIndex({ phone: 1 }, { unique: true });
    await mongoose.connection.db.collection('patients').createIndex({ email: 1 }, { sparse: true });
    
    // Appointment indexes
    await mongoose.connection.db.collection('appointments').createIndex({ clinic: 1, date: 1 });
    await mongoose.connection.db.collection('appointments').createIndex({ doctor: 1, date: 1 });
    await mongoose.connection.db.collection('appointments').createIndex({ patient: 1, date: 1 });
    await mongoose.connection.db.collection('appointments').createIndex({ status: 1 });
    
    // Billing indexes
    await mongoose.connection.db.collection('bills').createIndex({ patient: 1, date: -1 });
    await mongoose.connection.db.collection('bills').createIndex({ status: 1 });
    
    // Insurance indexes
    await mongoose.connection.db.collection('insuranceclaims').createIndex({ patient: 1, status: 1 });
    await mongoose.connection.db.collection('insuranceclaims').createIndex({ claimNumber: 1 }, { unique: true });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

module.exports = connectDB;
