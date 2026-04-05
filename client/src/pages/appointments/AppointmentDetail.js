import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch appointment details
  const { data: appointmentData, isLoading, error } = useQuery(
    ['appointment', id],
    async () => {
      const response = await api.get(`/appointments/${id}`);
      return response.data.appointment;
    },
    {
      enabled: !!id,
    }
  );

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'badge-blue',
      confirmed: 'badge-green',
      waiting: 'badge-yellow',
      in_consultation: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      no_show: 'badge-gray',
    };
    return colors[status] || 'badge-gray';
  };

  const handleCheckIn = async () => {
    try {
      await api.post(`/appointments/${id}/checkin`);
      // Refetch appointment data
      window.location.reload();
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  const handleStartConsultation = async () => {
    try {
      await api.post(`/appointments/${id}/start-consultation`);
      window.location.reload();
    } catch (error) {
      console.error('Start consultation error:', error);
    }
  };

  const handleCompleteConsultation = async () => {
    try {
      await api.post(`/appointments/${id}/complete-consultation`, {
        consultation: {
          notes: 'Consultation completed',
          diagnosis: 'Routine checkup',
        }
      });
      window.location.reload();
    } catch (error) {
      console.error('Complete consultation error:', error);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason) {
      try {
        await api.post(`/appointments/${id}/cancel`, { reason });
        navigate('/appointments');
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load appointment</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  const appointment = appointmentData;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/appointments')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="page-title">Appointment Details</h1>
              <p className="page-subtitle">
                View and manage appointment information
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {appointment.status === 'scheduled' && hasPermission('appointments.update') && (
              <>
                <button
                  onClick={handleCheckIn}
                  className="btn btn-success"
                >
                  Check In Patient
                </button>
                <button
                  onClick={handleCancel}
                  className="btn btn-danger"
                >
                  Cancel
                </button>
              </>
            )}
            {appointment.status === 'waiting' && hasPermission('appointments.update') && (
              <button
                onClick={handleStartConsultation}
                className="btn btn-primary"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Consultation
              </button>
            )}
            {appointment.status === 'in_consultation' && hasPermission('appointments.update') && (
              <button
                onClick={handleCompleteConsultation}
                className="btn btn-success"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Complete Consultation
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Appointment Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="form-label">Appointment ID</label>
                  <p className="text-sm text-gray-900 font-mono">{appointment._id}</p>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <span className={`badge ${getStatusColor(appointment.status)} capitalize`}>
                    {appointment.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(appointment.appointmentInfo?.date), 'EEEE, MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <p className="text-sm text-gray-900">{appointment.appointmentInfo?.time}</p>
                </div>
                <div>
                  <label className="form-label">Duration</label>
                  <p className="text-sm text-gray-900">{appointment.appointmentInfo?.duration} minutes</p>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <p className="text-sm text-gray-900 capitalize">
                    {appointment.appointmentInfo?.type?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="form-label">Booking Source</label>
                  <p className="text-sm text-gray-900 capitalize">
                    {appointment.appointmentInfo?.bookingSource?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="form-label">Created By</label>
                  <p className="text-sm text-gray-900">
                    {appointment.createdBy?.profile?.firstName} {appointment.createdBy?.profile?.lastName}
                  </p>
                </div>
              </div>

              {appointment.appointmentInfo?.notes && (
                <div className="mt-6">
                  <label className="form-label">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {appointment.appointmentInfo.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Patient Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Patient Information</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 h-12 w-12">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    {appointment.patient?.personalInfo?.firstName} {appointment.patient?.personalInfo?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">Patient ID: {appointment.patient?.registrationInfo?.patientId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{appointment.patient?.personalInfo?.phone}</span>
                </div>
                {appointment.patient?.personalInfo?.email && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-900">{appointment.patient?.personalInfo?.email}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    Age: {Math.floor((new Date() - new Date(appointment.patient?.personalInfo?.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-900 capitalize">
                    Gender: {appointment.patient?.personalInfo?.gender}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Consultation Details */}
          {(appointment.consultation || appointment.status === 'completed') && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Consultation Details</h3>
              </div>
              <div className="card-body">
                {appointment.consultation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {appointment.consultation.startTime && (
                        <div>
                          <label className="form-label">Start Time</label>
                          <p className="text-sm text-gray-900">
                            {format(new Date(appointment.consultation.startTime), 'h:mm a')}
                          </p>
                        </div>
                      )}
                      {appointment.consultation.endTime && (
                        <div>
                          <label className="form-label">End Time</label>
                          <p className="text-sm text-gray-900">
                            {format(new Date(appointment.consultation.endTime), 'h:mm a')}
                          </p>
                        </div>
                      )}
                    </div>

                    {appointment.consultation.vitals && (
                      <div>
                        <label className="form-label">Vitals</label>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {appointment.consultation.vitals.bloodPressure && (
                            <div>BP: {appointment.consultation.vitals.bloodPressure}</div>
                          )}
                          {appointment.consultation.vitals.heartRate && (
                            <div>HR: {appointment.consultation.vitals.heartRate} bpm</div>
                          )}
                          {appointment.consultation.vitals.temperature && (
                            <div>Temp: {appointment.consultation.vitals.temperature}°F</div>
                          )}
                          {appointment.consultation.vitals.weight && (
                            <div>Weight: {appointment.consultation.vitals.weight} kg</div>
                          )}
                        </div>
                      </div>
                    )}

                    {appointment.consultation.notes && (
                      <div>
                        <label className="form-label">Consultation Notes</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                          {appointment.consultation.notes}
                        </p>
                      </div>
                    )}

                    {appointment.consultation.diagnosis && (
                      <div>
                        <label className="form-label">Diagnosis</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                          {appointment.consultation.diagnosis}
                        </p>
                      </div>
                    )}

                    {appointment.consultation.prescription && appointment.consultation.prescription.length > 0 && (
                      <div>
                        <label className="form-label">Prescription</label>
                        <div className="space-y-2">
                          {appointment.consultation.prescription.map((med, index) => (
                            <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                              <strong>{med.medicine}</strong> - {med.dosage}, {med.frequency}
                              {med.duration && ` for ${med.duration}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No consultation details available</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Doctor Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Doctor</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Dr. {appointment.doctor?.profile?.firstName} {appointment.doctor?.profile?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500">{appointment.doctor?.profile?.specialization}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Check-in/Check-out Status */}
          {appointment.checkIn && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Check-in Status</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Checked In</p>
                      <p className="text-xs text-gray-500">
                        {appointment.checkIn.checkedInAt && 
                          format(new Date(appointment.checkIn.checkedInAt), 'MMM dd, yyyy h:mm a')
                        }
                      </p>
                    </div>
                  </div>
                  {appointment.checkIn.checkedOutAt && (
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Checked Out</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(appointment.checkIn.checkedOutAt), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Information */}
          {appointment.billing && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Billing</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Consultation Fee</span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{appointment.billing.consultationFee}
                    </span>
                  </div>
                  {appointment.billing.additionalServices && appointment.billing.additionalServices.length > 0 && (
                    <>
                      {appointment.billing.additionalServices.map((service, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm text-gray-500">{service.name}</span>
                          <span className="text-sm font-medium text-gray-900">
                            ₹{service.cost}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">
                        ₹{appointment.billing.totalAmount}
                      </span>
                    </div>
                  </div>
                  {appointment.billing.billGenerated && (
                    <div className="mt-3">
                      <span className="badge badge-success">Bill Generated</span>
                      {appointment.billing.billId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Bill ID: {appointment.billing.billId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {appointment.rescheduleHistory && appointment.rescheduleHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Reschedule History</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {appointment.rescheduleHistory.map((reschedule, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          Rescheduled from {format(new Date(reschedule.oldDate), 'MMM dd')} at {reschedule.oldTime}
                        </span>
                      </div>
                      <div className="ml-6 text-gray-500">
                        to {format(new Date(reschedule.newDate), 'MMM dd')} at {reschedule.newTime}
                      </div>
                      {reschedule.reason && (
                        <div className="ml-6 text-gray-500 text-xs">
                          Reason: {reschedule.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;
