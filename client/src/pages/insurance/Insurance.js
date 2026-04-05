import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const Insurance = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);

  // Fetch insurance claims
  const { data: insuranceData, isLoading, error } = useQuery(
    ['insurance', { search: searchTerm, status: statusFilter, provider: providerFilter, startDate, endDate, page }],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (providerFilter) params.append('provider', providerFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', '10');
      
      const response = await api.get(`/insurance?${params}`);
      return response.data;
    },
    {
      staleTime: 3 * 60 * 1000, // 3 minutes
    }
  );

  // Fetch overdue follow-ups
  const { data: overdueData } = useQuery(
    'overdue-followups',
    async () => {
      const response = await api.get('/insurance/followups/overdue');
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'badge-gray',
      submitted: 'badge-primary',
      pending: 'badge-warning',
      under_review: 'badge-blue',
      approved: 'badge-success',
      partially_approved: 'badge-warning',
      rejected: 'badge-danger',
      paid: 'badge-success',
    };
    return colors[status] || 'badge-gray';
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: DocumentTextIcon,
      submitted: ClockIcon,
      pending: ExclamationTriangleIcon,
      under_review: ClockIcon,
      approved: CheckCircleIcon,
      partially_approved: CheckCircleIcon,
      rejected: XCircleIcon,
      paid: CheckCircleIcon,
    };
    return icons[status] || DocumentTextIcon;
  };

  const handleSubmitClaim = async (claimId) => {
    try {
      await api.post(`/insurance/${claimId}/submit`);
      window.location.reload();
    } catch (error) {
      console.error('Submit claim error:', error);
    }
  };

  const handleAddFollowUp = async (claimId) => {
    // This would open a modal to add follow-up
    console.log('Add follow-up for claim:', claimId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insurance claims...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load insurance claims</h3>
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
            <h1 className="page-title">Insurance Management</h1>
            <p className="page-subtitle">
              Manage insurance claims and follow-ups
            </p>
          </div>
          {hasPermission('insurance.create') && (
            <button className="btn btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Claim
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Claims
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {insuranceData?.claims?.length || 0}
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
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {insuranceData?.claims?.filter(claim => 
                        ['submitted', 'pending', 'under_review'].includes(claim.claimInfo?.status)
                      ).length || 0}
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
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {insuranceData?.claims?.filter(claim => 
                        ['approved', 'partially_approved', 'paid'].includes(claim.claimInfo?.status)
                      ).length || 0}
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
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue Follow-ups
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {overdueData?.overdueFollowUps?.length || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
                  placeholder="Search claims..."
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
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="partially_approved">Partially Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label htmlFor="provider" className="form-label">
                Provider
              </label>
              <input
                type="text"
                id="provider"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="form-input"
                placeholder="Insurance provider"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="form-label">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="form-label">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
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

      {/* Claims Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Claim #</th>
                  <th className="table-header-cell">Patient</th>
                  <th className="table-header-cell">Provider</th>
                  <th className="table-header-cell">Claimed Amount</th>
                  <th className="table-header-cell">Approved Amount</th>
                  <th className="table-header-cell">Submitted</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {insuranceData?.claims?.length > 0 ? (
                  insuranceData.claims.map((claim) => {
                    const StatusIcon = getStatusIcon(claim.claimInfo?.status);
                    return (
                      <tr key={claim._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <StatusIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">
                                {claim.claimNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                Bill: {claim.bill?.billNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {claim.patient?.personalInfo?.firstName} {claim.patient?.personalInfo?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {claim.patient?.personalInfo?.phone}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm text-gray-900">
                            {claim.insuranceInfo?.provider}
                          </div>
                          <div className="text-xs text-gray-500">
                            Policy: {claim.insuranceInfo?.policyNumber?.slice(-4)}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{claim.claimInfo?.totalClaimAmount?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className={`text-sm font-medium ${
                            claim.claimInfo?.approvedAmount > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            ₹{claim.claimInfo?.approvedAmount?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm text-gray-900">
                            {format(new Date(claim.claimInfo?.submissionDate), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${getStatusColor(claim.claimInfo?.status)} capitalize`}>
                            {claim.claimInfo?.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button className="btn btn-sm btn-outline">
                              View
                            </button>
                            {claim.claimInfo?.status === 'draft' && hasPermission('insurance.update') && (
                              <button
                                onClick={() => handleSubmitClaim(claim._id)}
                                className="btn btn-sm btn-primary"
                              >
                                Submit
                              </button>
                            )}
                            {hasPermission('insurance.update') && (
                              <button
                                onClick={() => handleAddFollowUp(claim._id)}
                                className="btn btn-sm btn-warning"
                              >
                                Follow-up
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="text-gray-500">
                        <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No insurance claims found</p>
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
      {insuranceData?.pagination && insuranceData.pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((insuranceData.pagination.current - 1) * 10) + 1} to{' '}
            {Math.min(insuranceData.pagination.current * 10, insuranceData.pagination.total)} of{' '}
            {insuranceData.pagination.total} results
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
              Page {insuranceData.pagination.current} of {insuranceData.pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === insuranceData.pagination.pages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insurance;
