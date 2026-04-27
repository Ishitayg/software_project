import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import PatientSearch from '../../components/common/PatientSearch';
import DoctorSelect from '../../components/common/DoctorSelect';

const Appointments = () => {
  const { user, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: user?.role === 'doctor' ? user.id : '',
    appointmentDate: format(new Date(), 'yyyy-MM-dd'),
    appointmentTime: '09:00',
    type: 'consultation',
    notes: '',
    bookingSource: 'manual'
  });

  const [patientData, setPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    email: '',
  });

  // Fetch appointments
  const { data: appointmentsData, isLoading, error } = useQuery(
    ['appointments', { date: dateFilter, status: statusFilter, search: searchTerm }],
    async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/appointments?${params}`);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, 
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

  const handleCheckIn = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/checkin`);
      toast.success('Patient checked in');
      queryClient.invalidateQueries(['appointments']);
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in');
    }
  };

  const handleStartConsultation = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/start-consultation`);
      toast.success('Consultation started');
      navigate(`/appointments/${appointmentId}`);
    } catch (error) {
      console.error('Start consultation error:', error);
      toast.error('Failed to start consultation');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      try {
        await api.delete(`/appointments/${appointmentId}`);
        toast.success('Appointment deleted successfully');
        queryClient.invalidateQueries(['appointments']);
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.error || 'Failed to delete appointment');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientInputChange = (e) => {
    const { name, value } = e.target;
    setPatientData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalPatientId = formData.patientId;

      // If new patient, create patient first
      if (isNewPatient) {
        const patientResponse = await api.post('/patients', {
          ...patientData,
          clinicId: user.clinicId
        });
        finalPatientId = patientResponse.data.patient.id;
      }

      if (!finalPatientId) {
        toast.error('Please select or register a patient');
        setIsSubmitting(false);
        return;
      }

      await api.post('/appointments', {
        ...formData,
        patientId: finalPatientId,
        clinicId: user.clinicId
      });

      toast.success('Appointment created successfully!');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries(['appointments']);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(error.response?.data?.error || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      doctorId: user?.role === 'doctor' ? user.id : '',
      appointmentDate: format(new Date(), 'yyyy-MM-dd'),
      appointmentTime: '09:00',
      type: 'consultation',
      notes: '',
      bookingSource: 'manual'
    });
    setPatientData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male',
      phone: '',
      email: '',
    });
    setIsNewPatient(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <XCircleIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load appointments</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Appointments</h1>
            <p className="page-subtitle">
              Manage patient appointments and schedules
            </p>
          </div>
          {hasPermission('appointments.create') && (
            <button 
              className="btn btn-primary"
              onClick={() => { resetForm(); setIsModalOpen(true); }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Appointment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="search" className="form-label">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text" id="search" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10" placeholder="Search patients..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="date" className="form-label">
                Date
              </label>
              <input
                type="date" id="date" value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status" value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="waiting">Waiting</option>
                <option value="in_consultation">In Consultation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => {setSearchTerm(''); setStatusFilter(''); setDateFilter(format(new Date(), 'yyyy-MM-dd'))}}
                className="btn btn-outline w-full"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Patient</th>
                  <th className="table-header-cell">Doctor</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {appointmentsData?.appointments?.length > 0 ? (
                  appointmentsData.appointments.map((appointment) => (
                    <tr key={appointment.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center text-sm font-medium">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{appointment.appointmentTime}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {appointment.patient?.firstName} {appointment.patient?.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {appointment.patient?.patientId}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm text-gray-900">
                            Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 italic">
                            {appointment.doctor?.specialization}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-900 capitalize">
                          {appointment.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(appointment.status)} capitalize`}>
                          {appointment.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          {appointment.status === 'scheduled' && (hasPermission('appointments.update') || hasRole('management')) && (
                            <button
                              onClick={() => handleCheckIn(appointment.id)}
                              className="btn btn-sm btn-success"
                            >
                              Check In
                            </button>
                          )}
                          {appointment.status === 'waiting' && hasRole('doctor') && (
                            <button
                              onClick={() => handleStartConsultation(appointment.id)}
                              className="btn btn-sm btn-primary"
                            >
                              <PlayIcon className="h-3 w-3 mr-1" /> Start
                            </button>
                          )}
                          <button 
                            onClick={() => navigate(`/appointments/${appointment.id}`)}
                            className="btn btn-sm btn-outline"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" /> View
                          </button>
                          {(hasRole('management') || hasRole('system_admin')) && (
                             <button 
                               onClick={() => handleDelete(appointment.id)}
                               className="btn btn-sm btn-outline text-red-600 hover:bg-red-50 border-red-200"
                               title="Delete Appointment"
                             >
                               <TrashIcon className="h-3 w-3" />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-20">
                      <CalendarIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No appointments for this selection</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Today" value={appointmentsData?.appointments?.length || 0} icon={CalendarIcon} color="bg-blue-500" />
        <StatsCard title="Waiting" value={appointmentsData?.appointments?.filter(a => a.status === 'waiting').length || 0} icon={ClockIcon} color="bg-yellow-500" />
        <StatsCard title="In Progress" value={appointmentsData?.appointments?.filter(a => a.status === 'in_consultation').length || 0} icon={PlayIcon} color="bg-primary-500" />
        <StatsCard title="Completed" value={appointmentsData?.appointments?.filter(a => a.status === 'completed').length || 0} icon={CheckCircleIcon} color="bg-green-500" />
      </div>

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Schedule New Appointment</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    type="button" 
                    onClick={() => setIsNewPatient(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isNewPatient ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Existing Patient
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsNewPatient(true)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isNewPatient ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    New Patient
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {isNewPatient ? (
                  <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 space-y-4">
                    <h4 className="text-sm font-bold text-primary-900 uppercase tracking-wider mb-2">New Patient Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">First Name *</label>
                        <input type="text" name="firstName" value={patientData.firstName} onChange={handlePatientInputChange} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">Last Name *</label>
                        <input type="text" name="lastName" value={patientData.lastName} onChange={handlePatientInputChange} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">Phone *</label>
                        <input type="tel" name="phone" value={patientData.phone} onChange={handlePatientInputChange} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">Gender *</label>
                        <select name="gender" value={patientData.gender} onChange={handlePatientInputChange} className="form-select" required>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Date of Birth *</label>
                        <input type="date" name="dateOfBirth" value={patientData.dateOfBirth} onChange={handlePatientInputChange} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">Email</label>
                        <input type="email" name="email" value={patientData.email} onChange={handlePatientInputChange} className="form-input" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">Search Patient *</label>
                    <PatientSearch onSelect={(patient) => setFormData(prev => ({ ...prev, patientId: patient.id }))} />
                    {formData.patientId && (
                      <p className="mt-2 text-xs text-green-600 font-medium flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" /> Patient selected
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="form-label">Doctor *</label>
                    <DoctorSelect 
                      clinicId={user.clinicId} 
                      value={formData.doctorId} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Date *</label>
                    <input type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleInputChange} className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label">Time *</label>
                    <input type="time" name="appointmentTime" value={formData.appointmentTime} onChange={handleInputChange} className="form-input" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Type *</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="form-select" required>
                      <option value="consultation">Consultation</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Clinical Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="form-input" rows="2" placeholder="Symptom overview, reason for visit..." />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline px-6">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary px-8 shadow-lg shadow-primary-200">
                    {isSubmitting ? 'Processing...' : 'Schedule Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatsCard = ({ title, value, icon: Icon, color }) => (
  <div className="card">
    <div className="p-5 flex items-center">
      <div className={`p-3 rounded-xl ${color} text-white`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default Appointments;
