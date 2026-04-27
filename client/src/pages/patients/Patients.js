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
import { useQueryClient } from 'react-query';

const Patients = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: '',
    clinicId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);

  const queryClient = useQueryClient();

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
      staleTime: 0, // Always fetch fresh data for search
      refetchOnWindowFocus: false,
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
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get clinic ID from current user
      const userResponse = await api.get('/auth/profile');
      const clinicId = userResponse.data.user?.clinicId || userResponse.data.user?.clinic?.id;
      
      const patientData = {
        ...formData,
        clinicId: clinicId || '550e8400-e29b-41d4-a716-446655440001' // Default demo clinic
      };
      
      await api.post('/patients', patientData);
      
      // Reset form and close modal
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        phone: '',
        email: '',
        addressStreet: '',
        addressCity: '',
        clinicId: ''
      });
      setIsModalOpen(false);
      
      // Refresh patient list
      queryClient.invalidateQueries(['patients']);
      
      alert('Patient created successfully!');
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.response?.data?.error || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
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
          <button 
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Patient
          </button>
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
              <button 
                className="btn btn-outline w-full"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPage(1);
                }}
              >
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
                              {patient.personalInfo?.firstName} {patient.personalInfo?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.registrationInfo?.patientId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {patient.personalInfo?.phone}
                          </div>
                          {patient.personalInfo?.email && (
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
                            {getAge(patient.personalInfo?.dateOfBirth)} years
                          </div>
                          <div className="text-gray-500 capitalize">
                            {patient.personalInfo?.gender}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm font-mono text-gray-900">
                          {patient.registrationInfo?.patientId}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(patient.registrationInfo?.status)} capitalize`}>
                          {patient.registrationInfo?.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => setViewPatient(patient)}
                          >
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
                      {patientsData?.patients?.filter(p => p.registrationInfo?.status === 'active').length || 0}
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
                        const regDate = new Date(p.registrationInfo?.registrationDate);
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
                            patientsData.patients.reduce((sum, p) => sum + getAge(p.personalInfo?.dateOfBirth), 0) / 
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

      {/* New Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">New Patient</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      name="addressStreet"
                      value={formData.addressStreet}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Street address"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      name="addressCity"
                      value={formData.addressCity}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="City"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Patient Modal */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setViewPatient(null)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Patient Details</h3>
                <button 
                  onClick={() => setViewPatient(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Personal Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Full Name</label>
                        <p className="text-gray-900 font-medium">{viewPatient.personalInfo?.firstName} {viewPatient.personalInfo?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Date of Birth</label>
                        <p className="text-gray-900">{viewPatient.personalInfo?.dateOfBirth}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Gender</label>
                        <p className="text-gray-900 capitalize">{viewPatient.personalInfo?.gender}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Age</label>
                        <p className="text-gray-900">{getAge(viewPatient.personalInfo?.dateOfBirth)} years</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Phone</label>
                        <p className="text-gray-900">{viewPatient.personalInfo?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Email</label>
                        <p className="text-gray-900">{viewPatient.personalInfo?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Address</label>
                        <p className="text-gray-900">{viewPatient.personalInfo?.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Registration Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Patient ID</label>
                        <p className="text-gray-900 font-mono">{viewPatient.registrationInfo?.patientId || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Status</label>
                        <span className={`badge ${getStatusColor(viewPatient.registrationInfo?.status)} capitalize`}>
                          {viewPatient.registrationInfo?.status}
                        </span>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Registration Date</label>
                        <p className="text-gray-900">{viewPatient.registrationInfo?.registrationDate || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">System Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Internal ID</label>
                        <p className="text-gray-500 text-sm font-mono">{viewPatient.id}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Clinic ID</label>
                        <p className="text-gray-500 text-sm font-mono">{viewPatient.clinicId}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setViewPatient(null)}
                    className="btn btn-outline"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
