import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const Appointments = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

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
      staleTime: 2 * 60 * 1000, // 2 minutes
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
      // Refetch appointments
      window.location.reload();
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  const handleStartConsultation = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/start-consultation`);
      window.location.reload();
    } catch (error) {
      console.error('Start consultation error:', error);
    }
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
          <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
            <button className="btn btn-primary">
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
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Search patients..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="date" className="form-label">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="status" className="form-label">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
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
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className="btn btn-outline w-full">
                <FunnelIcon className="h-4 w-4 mr-2" />
                Reset Filters
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
                    <tr key={appointment._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{appointment.appointmentInfo.time}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patient?.personalInfo?.firstName} {appointment.patient?.personalInfo?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.patient?.personalInfo?.phone}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor?.profile?.firstName} {appointment.doctor?.profile?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.doctor?.profile?.specialization}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-900 capitalize">
                          {appointment.appointmentInfo.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(appointment.status)} capitalize`}>
                          {appointment.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          {appointment.status === 'scheduled' && hasPermission('appointments.update') && (
                            <button
                              onClick={() => handleCheckIn(appointment._id)}
                              className="btn btn-sm btn-success"
                            >
                              Check In
                            </button>
                          )}
                          {appointment.status === 'waiting' && hasPermission('appointments.update') && (
                            <button
                              onClick={() => handleStartConsultation(appointment._id)}
                              className="btn btn-sm btn-primary"
                            >
                              Start
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="text-gray-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No appointments found</p>
                      </div>
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
        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Today
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {appointmentsData?.appointments?.length || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-500">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {appointmentsData?.appointments?.filter(a => a.status === 'completed').length || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-yellow-500">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Waiting
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {appointmentsData?.appointments?.filter(a => a.status === 'waiting').length || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-red-500">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cancelled
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {appointmentsData?.appointments?.filter(a => a.status === 'cancelled').length || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
