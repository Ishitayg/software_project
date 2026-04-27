const { Op } = require('sequelize');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Appointment, Patient, User, Clinic } = require('../models');
const { 
  authenticate, 
  authorize, 
  auditLog
} = require('../middleware/auth');

const router = express.Router();

// Get appointments for a specific date and clinic
router.get('/', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), auditLog('appointments_list'), async (req, res) => {
  try {
    const { date, clinicId, doctorId, status } = req.query;
    const where = {};

    // Filter by user's clinic unless system admin
    if (req.user.role !== 'system_admin') {
      where.clinicId = req.user.clinicId;
    } else if (clinicId) {
      where.clinicId = clinicId;
    }

    if (date) {
      where.appointmentDate = date;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (status) {
      where.status = status;
    }

    const appointments = await Appointment.findAll({
      where,
      order: [['appointmentTime', 'ASC']],
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'phone', 'dateOfBirth'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'name'] }
      ]
    });

    res.json({ appointments });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Get appointment by ID
router.get('/:id', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), auditLog('appointment_view'), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'addressStreet', 'addressCity', 'addressState', 'operatingHours'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Appointment fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment.' });
  }
});

// Create new appointment
router.post('/', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), [
  body('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('doctorId').isUUID().withMessage('Valid doctor ID is required'),
  body('clinicId').isUUID().withMessage('Valid clinic ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid date is required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format is required (HH:MM)'),
  body('type').isIn(['consultation', 'follow_up', 'emergency', 'procedure']).withMessage('Invalid appointment type'),
  body('bookingSource').isIn(['walk_in', 'phone', 'whatsapp', 'online', 'manual']).withMessage('Invalid booking source')
], auditLog('appointment_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointmentData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointmentData.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate patient exists
    const patient = await Patient.findByPk(appointmentData.patientId);
    if (!patient) {
      return res.status(400).json({ error: 'Patient not found.' });
    }

    // Validate doctor exists and is active
    const doctor = await User.findByPk(appointmentData.doctorId);
    if (!doctor || doctor.role !== 'doctor' || !doctor.isActive) {
      return res.status(400).json({ error: 'Invalid doctor selected.' });
    }

    // Validate clinic exists
    const clinic = await Clinic.findByPk(appointmentData.clinicId);
    if (!clinic || !clinic.isActive) {
      return res.status(400).json({ error: 'Invalid clinic selected.' });
    }

    // Create appointment
    const appointment = await Appointment.create(appointmentData);

    // Check for conflicts
    const conflict = await appointment.checkConflict();
    if (conflict) {
      return res.status(409).json({ 
        error: 'Time slot conflict. Doctor already has an appointment at this time.',
        conflict: {
          time: conflict.appointmentTime,
          patientId: conflict.patientId
        }
      });
    }

    res.status(201).json({
      message: 'Appointment created successfully.',
      appointment
    });
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
});

// Update appointment
router.put('/:id', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), [
  body('appointmentDate').optional().isISO8601().withMessage('Valid date is required'),
  body('appointmentTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format is required (HH:MM)'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status')
], auditLog('appointment_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.appointmentTime;

    // Update appointment fields
    if (req.body.appointmentDate) appointment.appointmentDate = req.body.appointmentDate;
    if (req.body.appointmentTime) appointment.appointmentTime = req.body.appointmentTime;
    if (req.body.status) appointment.status = req.body.status;

    // If date or time changed, check for conflicts
    if (req.body.appointmentDate || req.body.appointmentTime) {
      const conflict = await appointment.checkConflict();
      if (conflict) {
        return res.status(409).json({ 
          error: 'Time slot conflict. Doctor already has an appointment at this time.',
          conflict: {
            time: conflict.appointmentTime,
            patientId: conflict.patientId
          }
        });
      }

      // Add to reschedule history
      const history = appointment.rescheduleHistory || [];
      history.push({
        oldDate: oldDate,
        oldTime: oldTime,
        newDate: appointment.appointmentDate,
        newTime: appointment.appointmentTime,
        reason: req.body.rescheduleReason || 'Rescheduled by staff',
        rescheduledBy: req.user.id,
        rescheduledAt: new Date()
      });
      appointment.rescheduleHistory = history;
    }

    await appointment.save();

    res.json({
      message: 'Appointment updated successfully.',
      appointment
    });
  } catch (error) {
    console.error('Appointment update error:', error);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

// Check-in patient
router.post('/:id/checkin', authenticate, authorize('management', 'system_admin', 'front_desk', 'nurse', 'doctor'), auditLog('appointment_checkin'), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (appointment.checkedInAt) {
      return res.status(400).json({ error: 'Patient already checked in.' });
    }

    appointment.checkedInAt = new Date();
    appointment.checkedInBy = req.user.id;
    appointment.status = 'waiting';

    await appointment.save();

    res.json({
      message: 'Patient checked in successfully.',
      appointment
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in patient.' });
  }
});

// Start consultation
router.post('/:id/start-consultation', authenticate, authorize('doctor', 'system_admin'), auditLog('consultation_start'), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check if user is in the same clinic or a system admin
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied. Only doctors in the same clinic can start consultation.' });
    }

    if (appointment.status !== 'waiting') {
      return res.status(400).json({ error: 'Appointment must be in waiting status to start consultation.' });
    }

    appointment.consultationStartTime = new Date();
    appointment.status = 'in_consultation';

    await appointment.save();

    res.json({
      message: 'Consultation started successfully.',
      appointment
    });
  } catch (error) {
    console.error('Start consultation error:', error);
    res.status(500).json({ error: 'Failed to start consultation.' });
  }
});

// Complete consultation
router.post('/:id/complete-consultation', authenticate, authorize('doctor', 'system_admin'), [
  body('consultationNotes').optional().trim(),
  body('diagnosis').optional().trim(),
  body('prescription').optional().isArray(),
  body('followUpDate').optional().isISO8601(),
  body('vitals').optional().isObject()
], auditLog('consultation_complete'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check if user is in the same clinic or a system admin
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied. Only doctors in the same clinic can complete consultation.' });
    }

    if (appointment.status !== 'in_consultation') {
      return res.status(400).json({ error: 'Consultation must be in progress to complete.' });
    }

    // Update consultation details
    if (req.body.consultationNotes) appointment.consultationNotes = req.body.consultationNotes;
    if (req.body.diagnosis) appointment.diagnosis = req.body.diagnosis;
    if (req.body.prescription) appointment.prescription = req.body.prescription;
    if (req.body.followUpDate) appointment.followUpDate = req.body.followUpDate;
    if (req.body.consultationDocuments) appointment.consultationDocuments = req.body.consultationDocuments;
    if (req.body.vitals) appointment.vitals = req.body.vitals;
    
    appointment.consultationEndTime = new Date();
    appointment.status = 'completed';

    await appointment.save();

    res.json({
      message: 'Consultation completed successfully.',
      appointment
    });
  } catch (error) {
    console.error('Complete consultation error:', error);
    res.status(500).json({ error: 'Failed to complete consultation.' });
  }
});

// Cancel appointment
router.post('/:id/cancel', authenticate, authorize('management', 'system_admin', 'front_desk', 'doctor', 'nurse'), [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
], auditLog('appointment_cancel'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled appointment.' });
    }

    appointment.status = 'cancelled';
    appointment.notes = (appointment.notes || '') + 
      `\n\nCancelled: ${req.body.reason} (by ${req.user.firstName} ${req.user.lastName})`;

    await appointment.save();

    res.json({
      message: 'Appointment cancelled successfully.',
      appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Get available time slots for a doctor on a specific date
router.get('/available-slots', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), async (req, res) => {
  try {
    const { clinicId, doctorId, date } = req.query;

    if (!clinicId || !doctorId || !date) {
      return res.status(400).json({ error: 'Clinic ID, doctor ID, and date are required.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found.' });
    }

    // Get existing appointments for that date and doctor
    const existingAppointments = await Appointment.findAll({
      where: {
        clinicId,
        doctorId,
        appointmentDate: date,
        status: { [Op.notIn]: ['cancelled', 'no_show'] }
      }
    });

    // Get day schedule
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[new Date(date).getDay()];
    const daySchedule = clinic.operatingHours[dayName];
    
    if (!daySchedule || daySchedule.closed) {
      return res.json({ availableSlots: [] });
    }

    // Generate time slots
    const slots = [];
    const [openHour, openMin] = daySchedule.open.split(':').map(Number);
    const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
    
    const slotDuration = 30; // 30 minutes
    let currentHour = openHour;
    let currentMin = openMin;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const isBooked = existingAppointments.some(apt => apt.appointmentTime === timeString);
      
      if (!isBooked) {
        slots.push({ time: timeString, available: true });
      }
      
      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin = 0;
      }
    }

    res.json({ availableSlots: slots });
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots.' });
  }
});

// Delete appointment
router.delete('/:id', authenticate, authorize('management', 'system_admin'), auditLog('appointment_delete'), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        appointment.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await appointment.destroy();

    res.json({
      message: 'Appointment deleted successfully.'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment.' });
  }
});

// Get peak hour analysis
router.get('/peak-analysis', authenticate, authorize('management', 'system_admin'), async (req, res) => {
  try {
    const { clinicId, startDate, endDate } = req.query;

    if (!clinicId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Clinic ID, start date, and end date are required.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get appointments in date range
    const appointments = await Appointment.findAll({
      where: {
        clinicId,
        appointmentDate: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        },
        status: { [Op.notIn]: ['cancelled', 'no_show'] }
      }
    });

    // Group by hour
    const hourCounts = {};
    appointments.forEach(apt => {
      const hour = parseInt(apt.appointmentTime.split(':')[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakAnalysis = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    })).sort((a, b) => a.hour - b.hour);

    res.json({ peakAnalysis });
  } catch (error) {
    console.error('Peak analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch peak hour analysis.' });
  }
});

module.exports = router;
