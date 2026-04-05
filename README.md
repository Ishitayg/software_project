# Integrated Clinic Operations Management System (ICOMS)

A comprehensive web-based clinic management system designed to streamline operations across multiple outpatient clinics with real-time appointment management, patient records, billing, and insurance workflows.

## 🏥 Features

### Core Modules
- **Appointment Management**: Real-time scheduling, conflict detection, multi-clinic support
- **Patient Records**: Unified profiles with medical history, documents, and cross-clinic access
- **Billing & Payments**: Multi-mode payment processing, partial payments, automated invoicing
- **Insurance Management**: Claim lifecycle tracking, document management, automated follow-ups
- **Reporting & Analytics**: Real-time dashboards, revenue reports, performance metrics
- **User Management**: Role-based access control, audit logging, multi-clinic support

### Key Capabilities
- 🔄 Real-time appointment scheduling with conflict detection
- 👥 Multi-role support (Front Desk, Doctors, Nurses, Billing, Insurance, Management)
- 🏥 Multi-clinic operations with centralized data
- 💳 Comprehensive billing with multiple payment methods
- 📊 Near real-time reporting and analytics
- 🔒 Role-based access control with audit trails
- 📱 Responsive web interface for all devices

## 🏗️ Architecture

### System Architecture
- **Layered Architecture**: 4-tier separation (Presentation → Service → Domain → Data)
- **Service-Oriented Design**: Independent subsystems for each business domain
- **Client-Server Model**: Browser-based SPA with REST API backend
- **Event-Driven Components**: Async notifications and workflow triggers

### Technology Stack

#### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Express Validator** for input validation

#### Frontend
- **React** with modern hooks
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Router** for navigation

#### Database
- **MongoDB** for primary data storage
- **GridFS** for document storage
- **Redis** for caching (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd integrated-clinic-operations-management-system
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Environment Setup**
```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

4. **Database Setup**
```bash
# Start MongoDB service
mongod

# The application will auto-create the database and indexes
```

5. **Start the Application**
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or separately:
npm run server  # Backend only
npm run client  # Frontend only
```

6. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
integrated-clinic-operations-management-system/
├── server/                          # Backend application
│   ├── config/                      # Configuration files
│   │   └── database.js              # Database connection and indexes
│   ├── middleware/                  # Express middleware
│   │   └── auth.js                  # Authentication & authorization
│   ├── models/                      # Mongoose data models
│   │   ├── User.js                  # User model with RBAC
│   │   ├── Patient.js               # Patient records model
│   │   ├── Appointment.js           # Appointment scheduling model
│   │   ├── Clinic.js                # Clinic information model
│   │   ├── Bill.js                  # Billing and payments model
│   │   └── InsuranceClaim.js        # Insurance claims model
│   ├── routes/                      # API route handlers
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── appointments.js          # Appointment management
│   │   ├── patients.js              # Patient records
│   │   ├── billing.js               # Billing and payments
│   │   ├── insurance.js             # Insurance management
│   │   └── reports.js               # Reporting and analytics
│   └── index.js                     # Main server entry point
├── client/                          # React frontend application
│   ├── public/                      # Static assets
│   ├── src/                         # Source code
│   │   ├── components/              # React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API service functions
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── utils/                   # Utility functions
│   │   └── App.js                   # Main application component
│   └── package.json                 # Frontend dependencies
├── uploads/                         # File upload storage
│   ├── patients/                    # Patient documents
│   └── insurance/                   # Insurance claim documents
├── docs/                            # Documentation
├── package.json                     # Root package.json
└── README.md                        # This file
```

## 🔐 Authentication & Authorization

### User Roles
- **Front Desk Staff**: Appointment booking, patient check-in/out
- **Doctors**: Patient records, consultation notes, medical data
- **Nurses**: Vitals, test results, patient assistance
- **Billing Staff**: Bill generation, payment processing
- **Insurance Team**: Claim submission, tracking, follow-ups
- **Management**: Reports, analytics, oversight
- **System Admin**: User management, system configuration

### Permission System
- Role-based access control (RBAC)
- Granular permissions per module
- Audit logging for all actions
- Multi-clinic access control

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Appointment Management
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `POST /api/appointments/:id/checkin` - Check-in patient
- `POST /api/appointments/:id/start-consultation` - Start consultation

### Patient Records
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `POST /api/patients/:id/documents` - Upload documents

### Billing & Payments
- `GET /api/billing` - List bills
- `POST /api/billing` - Create bill
- `POST /api/billing/:id/payments` - Add payment
- `GET /api/billing/outstanding/list` - Get outstanding bills

### Insurance Management
- `GET /api/insurance` - List insurance claims
- `POST /api/insurance` - Create insurance claim
- `POST /api/insurance/:id/submit` - Submit claim
- `POST /api/insurance/:id/documents` - Upload documents

### Reports & Analytics
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/clinic-utilization` - Clinic utilization report
- `GET /api/reports/doctor-performance` - Doctor performance report
- `GET /api/reports/revenue` - Revenue report

## 🔧 Configuration

### Environment Variables
Key environment variables in `server/.env`:

```env
PORT=5000                              # Server port
MONGODB_URI=mongodb://localhost:27017/icoms  # Database connection
JWT_SECRET=your-secret-key             # JWT signing secret
CLIENT_URL=http://localhost:3000       # Frontend URL (CORS)
```

### Database Configuration
- MongoDB automatically creates required indexes on startup
- Supports replica sets for production
- GridFS for document storage

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# Integration tests
npm run test:integration
```

### Test Coverage
- Unit tests for all models and services
- Integration tests for API endpoints
- Frontend component tests
- End-to-end test scenarios

## 🚀 Deployment

### Production Setup
1. **Environment Preparation**
```bash
export NODE_ENV=production
export MONGODB_URI=mongodb://prod-server:27017/icoms
export JWT_SECRET=your-production-secret
```

2. **Build Application**
```bash
npm run build
```

3. **Start Production Server**
```bash
npm start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t icoms .

# Run container
docker run -p 5000:5000 icoms
```

## 📈 Performance & Scalability

### Performance Features
- Database indexing for fast queries
- Redis caching for frequently accessed data
- Connection pooling for database
- Compressed responses with gzip
- Rate limiting for API protection

### Scalability Considerations
- Stateless API design
- Horizontal scaling support
- Load balancer ready
- Database sharding support
- Microservices architecture ready

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Audit logging
- File upload security
- HTTPS enforcement in production

## 📝 Logging & Monitoring

### Application Logging
- Structured logging with winston
- Log levels: error, warn, info, debug
- File and console output
- Request/response logging
- Error tracking

### Monitoring
- Health check endpoint
- Performance metrics
- Database connection monitoring
- Memory usage tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the FAQ section

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with core functionality
- Appointment management
- Patient records
- Billing system
- Insurance management
- Basic reporting

### Planned Features (v2.0)
- Patient mobile app
- SMS/WhatsApp notifications
- Advanced analytics
- Lab and pharmacy integrations
- Telemedicine support

---

**Built with ❤️ for healthcare professionals**
