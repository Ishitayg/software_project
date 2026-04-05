import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  CalendarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const Patients = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch patients
  const { data: patientsData, isLoading, error } = useQuery(
    ['patients', { search: searchTerm, status: statusFilter, page }],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', '10');
      
      const response = await api.get(`/patients?${params}`);
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
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
          <p className="text-gray-600">Loading patients...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load patients</h3>
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
            <h1 className="page-title">Patients</h1>
            <p className="page-subtitle">
              Manage patient records and information
            </p>
          </div>
          {hasPermission('patients.create') && (
            <button className="btn btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Patient
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  placeholder="Search by name, phone, or ID..."
                />
              </div>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
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

      {/* Patients Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Patient</th>
                  <th className="table-header-cell">Contact</th>
                  <th className="table-header-cell">Age/Gender</th>
                  <th className="table-header-cell">Patient ID</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {patientsData?.patients?.length > 0 ? (
                  patientsData.patients.map((patient) => (
                    <tr key={patient._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.personalInfo.firstName} {patient.personalInfo.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.registrationInfo.patientId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {patient.personalInfo.phone}
                          </div>
                          {patient.personalInfo.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-1" />
                              {patient.personalInfo.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {getAge(patient.personalInfo.dateOfBirth)} years
                          </div>
                          <div className="text-gray-500 capitalize">
                            {patient.personalInfo.gender}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm font-mono text-gray-900">
                          {patient.registrationInfo.patientId}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(patient.registrationInfo.status)} capitalize`}>
                          {patient.registrationInfo.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button className="btn btn-sm btn-outline">
                            View
                          </button>
                          {hasPermission('patients.update') && (
                            <button className="btn btn-sm btn-outline">
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="text-gray-500">
                        <UserIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No patients found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {patientsData?.pagination && patientsData.pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((patientsData.pagination.current - 1) * 10) + 1} to{' '}
            {Math.min(patientsData.pagination.current * 10, patientsData.pagination.total)} of{' '}
            {patientsData.pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {patientsData.pagination.current} of {patientsData.pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === patientsData.pagination.pages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Patients
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {patientsData?.pagination?.total || 0}
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
                    Active Patients
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {patientsData?.patients?.filter(p => p.registrationInfo.status === 'active').length || 0}
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
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    New This Month
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {patientsData?.patients?.filter(p => {
                        const regDate = new Date(p.registrationInfo.registrationDate);
                        const thisMonth = new Date();
                        return regDate.getMonth() === thisMonth.getMonth() && 
                               regDate.getFullYear() === thisMonth.getFullYear();
                      }).length || 0}
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
              <div className="flex-shrink-0 p-3 rounded-md bg-purple-500">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Age
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {patientsData?.patients?.length > 0 
                        ? Math.round(
                            patientsData.patients.reduce((sum, p) => sum + getAge(p.personalInfo.dateOfBirth), 0) / 
                            patientsData.patients.length
                          )
                        : 0}
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

export default Patients;
