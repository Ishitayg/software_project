const { Op } = require('sequelize');
const express = require('express');
const { query, validationResult } = require('express-validator');
const { Appointment, Patient, Bill, InsuranceClaim, User, Clinic } = require('../models');
const { 
  authenticate, 
  authorize, 
  auditLog 
} = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticate, authorize('management', 'system_admin'), auditLog('dashboard_view'), async (req, res) => {
  try {
    const { clinicId, startDate, endDate } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;
    
    const whereClause = { clinicId: filterClinicId };
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    // Get all statistics in parallel
    const [
      totalAppointments,
      totalPatients,
      totalBills,
      totalClaims,
      revenue
    ] = await Promise.all([
      Appointment.count({ where: whereClause }),
      Patient.count({ where: whereClause }),
      Bill.count({ where: whereClause }),
      InsuranceClaim.count({ where: whereClause }),
      Bill.sum('paidAmount', { where: whereClause })
    ]);

    res.json({
      dashboard: {
        appointments: { total: totalAppointments },
        patients: { total: totalPatients },
        billing: { totalBills, revenue: revenue || 0 },
        insurance: { totalClaims }
      }
    });
  } catch (error) {
    console.error('Dashboard statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// Get clinic utilization report
router.get('/clinic-utilization', authenticate, authorize('management', 'system_admin'), auditLog('clinic_utilization_report'), [
  query('clinicId').optional().isUUID().withMessage('Invalid clinic ID'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid group by option')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clinicId, startDate, endDate, groupBy = 'day' } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const appointments = await Appointment.findAll({
      where: {
        clinicId: filterClinicId,
        appointmentDate: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        }
      }
    });

    // Group appointments by date
    const grouped = {};
    appointments.forEach(apt => {
      const date = apt.appointmentDate;
      let key;
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = Math.floor(date.getDate() / 7) + 1;
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, total: 0, completed: 0, cancelled: 0 };
      }
      grouped[key].total++;
      if (apt.status === 'completed') grouped[key].completed++;
      if (apt.status === 'cancelled') grouped[key].cancelled++;
    });

    res.json({ utilization: Object.values(grouped) });
  } catch (error) {
    console.error('Clinic utilization report error:', error);
    res.status(500).json({ error: 'Failed to generate clinic utilization report.' });
  }
});

// Get doctor performance report
router.get('/doctor-performance', authenticate, authorize('management', 'system_admin'), auditLog('doctor_performance_report'), [
  query('clinicId').optional().isUUID().withMessage('Invalid clinic ID'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clinicId, startDate, endDate } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const appointments = await Appointment.findAll({
      where: {
        clinicId: filterClinicId,
        appointmentDate: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        }
      },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] }
      ]
    });

    // Group by doctor
    const performance = {};
    appointments.forEach(apt => {
      if (!apt.doctor) return;
      const docId = apt.doctor.id;
      if (!performance[docId]) {
        performance[docId] = {
          doctor: apt.doctor,
          totalAppointments: 0,
          completed: 0,
          cancelled: 0
        };
      }
      performance[docId].totalAppointments++;
      if (apt.status === 'completed') performance[docId].completed++;
      if (apt.status === 'cancelled') performance[docId].cancelled++;
    });

    res.json({ performance: Object.values(performance) });
  } catch (error) {
    console.error('Doctor performance report error:', error);
    res.status(500).json({ error: 'Failed to generate doctor performance report.' });
  }
});

// Get revenue report
router.get('/revenue', authenticate, authorize('management', 'billing', 'system_admin'), auditLog('revenue_report'), [
  query('clinicId').optional().isUUID().withMessage('Invalid clinic ID'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid group by option')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clinicId, startDate, endDate, groupBy = 'day' } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const bills = await Bill.findAll({
      where: {
        clinicId: filterClinicId,
        createdAt: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        },
        status: 'paid'
      }
    });

    // Group by date
    const grouped = {};
    bills.forEach(bill => {
      const date = bill.createdAt;
      let key;
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = Math.floor(date.getDate() / 7) + 1;
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, revenue: 0, billCount: 0 };
      }
      grouped[key].revenue += parseFloat(bill.paidAmount) || 0;
      grouped[key].billCount++;
    });

    res.json({ revenue: Object.values(grouped) });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report.' });
  }
});

// Get patient demographics report
router.get('/patient-demographics', authenticate, authorize('management', 'system_admin'), auditLog('patient_demographics_report'), [
  query('clinicId').optional().isUUID().withMessage('Invalid clinic ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clinicId } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const patients = await Patient.findAll({
      where: { clinicId: filterClinicId }
    });

    const demographics = {
      totalPatients: patients.length,
      genderDistribution: { male: 0, female: 0, other: 0 },
      ageDistribution: { '0-18': 0, '19-35': 0, '36-50': 0, '50+': 0 }
    };

    patients.forEach(patient => {
      // Gender
      const gender = patient.gender;
      if (demographics.genderDistribution[gender] !== undefined) {
        demographics.genderDistribution[gender]++;
      }

      // Age
      if (patient.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
        if (age <= 18) demographics.ageDistribution['0-18']++;
        else if (age <= 35) demographics.ageDistribution['19-35']++;
        else if (age <= 50) demographics.ageDistribution['36-50']++;
        else demographics.ageDistribution['50+']++;
      }
    });

    res.json({ demographics });
  } catch (error) {
    console.error('Patient demographics report error:', error);
    res.status(500).json({ error: 'Failed to generate patient demographics report.' });
  }
});

// Get peak hours analysis
router.get('/peak-hours', authenticate, authorize('management', 'system_admin'), auditLog('peak_hours_report'), [
  query('clinicId').optional().isUUID().withMessage('Invalid clinic ID'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clinicId, startDate, endDate } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const appointments = await Appointment.findAll({
      where: {
        clinicId: filterClinicId,
        appointmentDate: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        }
      }
    });

    // Group by hour
    const hourCounts = {};
    appointments.forEach(apt => {
      const hour = parseInt(apt.appointmentTime.split(':')[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    })).sort((a, b) => a.hour - b.hour);

    res.json({ peakHours });
  } catch (error) {
    console.error('Peak hours report error:', error);
    res.status(500).json({ error: 'Failed to generate peak hours report.' });
  }
});

// Export report to Excel/PDF
router.get('/export/:type', authenticate, authorize('management', 'system_admin'), async (req, res) => {
  try {
    const { type } = req.params;
    const { reportType, clinicId, startDate, endDate, format = 'excel' } = req.query;

    if (!['excel', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

    if (!['dashboard', 'clinic-utilization', 'doctor-performance', 'revenue', 'patient-demographics'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type.' });
    }

    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    // TODO: Implement actual Excel/PDF generation
    // For now, return the data that would be exported
    let reportData = { message: 'Report export functionality to be implemented' };

    res.json({
      message: `${format.toUpperCase()} export endpoint - implement ${format} generation here`,
      reportType,
      format,
      data: reportData
    });
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ error: 'Failed to export report.' });
  }
});

// Helper functions removed - using inline queries instead

module.exports = router;
