import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch patient details
  const { data: patientData, isLoading, error } = useQuery(
    ['patient', id],
    async () => {
      const response = await api.get(`/patients/${id}`);
      return response.data.patient;
    },
    {
      enabled: !!id,
    }
  );

  const getStatusColor = (status) => {
    const colors = {
      active: 'badge-success',
      inactive: 'badge-warning',
      deceased: 'badge-danger',
    };
    return colors[status] || 'badge-gray';
  };

  const getAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient details...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load patient</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  const patient = patientData;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/patients')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="page-title">Patient Details</h1>
              <p className="page-subtitle">
                Comprehensive patient information and history
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {hasPermission('patients.update') && (
              <button className="btn btn-primary">
                Edit Patient
              </button>
            )}
            {hasPermission('appointments.create') && (
              <button className="btn btn-success">
                Book Appointment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Personal Information</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {patient.personalInfo.firstName} {patient.personalInfo.lastName}
                  </h2>
                  <p className="text-sm text-gray-500">Patient ID: {patient.registrationInfo.patientId}</p>
                  <span className={`badge ${getStatusColor(patient.registrationInfo.status)} capitalize mt-2`}>
                    {patient.registrationInfo.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(patient.personalInfo.dateOfBirth), 'MMMM dd, yyyy')} ({getAge(patient.personalInfo.dateOfBirth)} years)
                  </p>
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <p className="text-sm text-gray-900 capitalize">{patient.personalInfo.gender}</p>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{patient.personalInfo.phone}</span>
                  </div>
                </div>
                {patient.personalInfo.email && (
                  <div>
                    <label className="form-label">Email</label>
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{patient.personalInfo.email}</span>
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="form-label">Address</label>
                  <p className="text-sm text-gray-900">
                    {patient.personalInfo.address?.street}, {patient.personalInfo.address?.city},{' '}
                    {patient.personalInfo.address?.state} {patient.personalInfo.address?.postalCode}
                  </p>
                </div>
                {patient.personalInfo.emergencyContact && (
                  <div className="sm:col-span-2">
                    <label className="form-label">Emergency Contact</label>
                    <p className="text-sm text-gray-900">
                      {patient.personalInfo.emergencyContact.name} - {patient.personalInfo.emergencyContact.phone}
                      {patient.personalInfo.emergencyContact.relationship && ` (${patient.personalInfo.emergencyContact.relationship})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Medical Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {patient.medicalInfo.bloodGroup && (
                  <div>
                    <label className="form-label">Blood Group</label>
                    <p className="text-sm text-gray-900">{patient.medicalInfo.bloodGroup}</p>
                  </div>
                )}
                {patient.medicalInfo.primaryPhysician && (
                  <div>
                    <label className="form-label">Primary Physician</label>
                    <p className="text-sm text-gray-900">
                      Dr. {patient.medicalInfo.primaryPhysician.profile?.firstName} {patient.medicalInfo.primaryPhysician.profile?.lastName}
                    </p>
                  </div>
                )}
              </div>

              {patient.medicalInfo.allergies && patient.medicalInfo.allergies.length > 0 && (
                <div className="mt-6">
                  <label className="form-label">Allergies</label>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalInfo.allergies.map((allergy, index) => (
                      <span key={index} className="badge badge-warning">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {patient.medicalInfo.chronicConditions && patient.medicalInfo.chronicConditions.length > 0 && (
                <div className="mt-6">
                  <label className="form-label">Chronic Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalInfo.chronicConditions.map((condition, index) => (
                      <span key={index} className="badge badge-primary">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {patient.medicalInfo.medications && patient.medicalInfo.medications.length > 0 && (
                <div className="mt-6">
                  <label className="form-label">Current Medications</label>
                  <div className="space-y-2">
                    {patient.medicalInfo.medications.map((med, index) => (
                      <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        <strong>{med.name}</strong> - {med.dosage}
                        {med.frequency && `, ${med.frequency}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insurance Information */}
          {patient.insurance && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Insurance Information</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Provider</label>
                    <p className="text-sm text-gray-900">{patient.insurance.provider}</p>
                  </div>
                  <div>
                    <label className="form-label">Policy Number</label>
                    <p className="text-sm text-gray-900 font-mono">{patient.insurance.policyNumber}</p>
                  </div>
                  <div>
                    <label className="form-label">Policy Holder</label>
                    <p className="text-sm text-gray-900">{patient.insurance.policyHolder}</p>
                  </div>
                  <div>
                    <label className="form-label">Coverage Type</label>
                    <p className="text-sm text-gray-900 capitalize">{patient.insurance.coverageType}</p>
                  </div>
                  {patient.insurance.validFrom && (
                    <div>
                      <label className="form-label">Valid From</label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(patient.insurance.validFrom), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {patient.insurance.validTo && (
                    <div>
                      <label className="form-label">Valid To</label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(patient.insurance.validTo), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Appointments */}
          {patient.visitHistory && patient.visitHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Recent Visits</h3>
              </div>
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Date</th>
                        <th className="table-header-cell">Doctor</th>
                        <th className="table-header-cell">Type</th>
                        <th className="table-header-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {patient.visitHistory.map((visit) => (
                        <tr key={visit._id} className="table-row">
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {format(new Date(visit.appointmentInfo.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">{visit.appointmentInfo.time}</div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              Dr. {visit.doctor.profile.firstName} {visit.doctor.profile.lastName}
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-gray-900 capitalize">
                              {visit.appointmentInfo.type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${getStatusColor(visit.status)} capitalize`}>
                              {visit.status?.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Statistics</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Visits</span>
                  <span className="text-sm font-medium text-gray-900">
                    {patient.statistics.totalVisits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Billed</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{patient.statistics.totalBilled.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Visit</span>
                  <span className="text-sm font-medium text-gray-900">
                    {patient.statistics.lastVisit 
                      ? format(new Date(patient.statistics.lastVisit), 'MMM dd, yyyy')
                      : 'No visits yet'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Upcoming</span>
                  <span className="text-sm font-medium text-gray-900">
                    {patient.statistics.upcomingAppointments}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {patient.upcomingAppointments && patient.upcomingAppointments.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Upcoming Appointments</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {patient.upcomingAppointments.map((appointment) => (
                    <div key={appointment._id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {format(new Date(appointment.appointmentInfo.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.appointmentInfo.time} - Dr. {appointment.doctor.profile.firstName} {appointment.doctor.profile.lastName}
                      </div>
                      <span className={`badge ${getStatusColor(appointment.status)} capitalize mt-1`}>
                        {appointment.status?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Registration Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Registration</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Registration Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(patient.registrationInfo.registrationDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Clinic</span>
                  <span className="text-sm font-medium text-gray-900">
                    {patient.registrationInfo.registrationClinic.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Patient ID</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {patient.registrationInfo.patientId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          {patient.documents && patient.documents.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Documents</h3>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {patient.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View
                      </button>
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

export default PatientDetail;
