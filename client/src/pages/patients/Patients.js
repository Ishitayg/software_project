import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  PlusIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Patients = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: '',
  });

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
      staleTime: 60000, 
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
      await api.post('/patients', {
        ...formData,
        clinicId: user.clinicId
      });
      toast.success('Patient registered successfully');
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        phone: '',
        email: '',
        addressStreet: '',
        addressCity: '',
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries(['patients']);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(error.response?.data?.error || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4 border-primary-500"></div>
          <p className="text-gray-500 animate-pulse">Loading patient records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Patient Management</h1>
            <p className="page-subtitle">Unified registry for all clinical patient records</p>
          </div>
          {hasPermission('patients.create') && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary shadow-lg shadow-primary-200">
              <PlusIcon className="h-4 w-4 mr-2" />
              Register Patient
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="form-label">Search Patients</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10" placeholder="Search by name, phone, or Patient ID..."
                />
              </div>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select">
                <option value="">All Registries</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => {setSearchTerm(''); setStatusFilter(''); setPage(1);}}
                className="btn btn-outline w-full"
              >
                <FunnelIcon className="h-4 w-4 mr-2" /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card overflow-hidden">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell text-xs font-bold uppercase tracking-wider">Patient Information</th>
                  <th className="table-header-cell text-xs font-bold uppercase tracking-wider">Contact Details</th>
                  <th className="table-header-cell text-xs font-bold uppercase tracking-wider">Registry Info</th>
                  <th className="table-header-cell text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body divide-y divide-gray-50">
                {patientsData?.patients?.length > 0 ? (
                  patientsData.patients.map((patient) => (
                    <tr key={patient.id} className="table-row hover:bg-primary-50/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{patient.firstName} {patient.lastName}</div>
                            <div className="text-xs text-gray-500 font-medium">
                              {getAge(patient.dateOfBirth)} yrs • {patient.gender}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm font-medium text-gray-700">
                            <PhoneIcon className="h-3 w-3 mr-2 text-gray-400" /> {patient.phone}
                          </div>
                          {patient.email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <EnvelopeIcon className="h-3 w-3 mr-2 text-gray-400" /> {patient.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-xs font-mono font-bold text-gray-400 mb-1">{patient.patientId}</div>
                          <span className={`badge ${getStatusColor(patient.status)} text-[10px] uppercase font-bold`}>
                            {patient.status}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                            title="View Records"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-20 bg-gray-50/30">
                      <UserIcon className="h-12 w-12 mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-500 font-medium">No patient records found in this registry</p>
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
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-500 font-medium">
            Page <span className="text-gray-900">{patientsData.pagination.current}</span> of {patientsData.pagination.pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)} disabled={page === 1}
              className="btn btn-sm btn-outline disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)} disabled={page === patientsData.pagination.pages}
              className="btn btn-sm btn-outline disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Register Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setIsModalOpen(false)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-8 pt-8 pb-6">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Register New Patient</h3>
                  <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="form-input" required />
                    </div>
                    <div>
                      <label className="form-label">Last Name *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="form-input" required />
                    </div>
                    <div>
                      <label className="form-label">Date of Birth *</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="form-input" required />
                    </div>
                    <div>
                      <label className="form-label">Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select" required>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-input" required placeholder="+91 0000000000" />
                    </div>
                    <div>
                      <label className="form-label">Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-input" placeholder="patient@example.com" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="form-label text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 block">Residential Address</label>
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" name="addressStreet" value={formData.addressStreet} onChange={handleInputChange} className="form-input" placeholder="Street Name / House No." />
                             <input type="text" name="addressCity" value={formData.addressCity} onChange={handleInputChange} className="form-input" placeholder="City" />
                        </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline px-8">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary px-8 shadow-lg shadow-primary-100">
                      {isSubmitting ? 'Processing...' : 'Register Patient'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
