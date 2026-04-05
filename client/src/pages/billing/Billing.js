import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const Billing = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);

  // Fetch bills
  const { data: billingData, isLoading, error } = useQuery(
    ['billing', { search: searchTerm, status: statusFilter, startDate, endDate, page }],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', '10');
      
      const response = await api.get(`/billing?${params}`);
      return response.data;
    },
    {
      staleTime: 3 * 60 * 1000, // 3 minutes
    }
  );

  // Fetch outstanding bills
  const { data: outstandingData } = useQuery(
    'outstanding-bills',
    async () => {
      const response = await api.get('/billing/outstanding/list');
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'badge-gray',
      generated: 'badge-primary',
      partial_paid: 'badge-warning',
      paid: 'badge-success',
      overdue: 'badge-danger',
      cancelled: 'badge-gray',
    };
    return colors[status] || 'badge-gray';
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: BanknotesIcon,
      card: CreditCardIcon,
      digital: DocumentTextIcon,
      insurance: DocumentTextIcon,
      mixed: CurrencyDollarIcon,
    };
    return icons[method] || CurrencyDollarIcon;
  };

  const handleAddPayment = async (billId) => {
    // This would open a modal to add payment
    console.log('Add payment for bill:', billId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load billing data</h3>
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
            <h1 className="page-title">Billing</h1>
            <p className="page-subtitle">
              Manage bills, payments, and financial transactions
            </p>
          </div>
          {hasPermission('billing.create') && (
            <button className="btn btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Bill
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-500">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ₹{billingData?.bills?.reduce((sum, bill) => sum + (bill.financials?.totalAmount || 0), 0).toLocaleString()}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Outstanding
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {outstandingData?.bills?.length || 0}
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
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Bills
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {billingData?.bills?.length || 0}
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
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Partial Paid
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {billingData?.bills?.filter(bill => bill.billingInfo?.status === 'partial_paid').length || 0}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                  placeholder="Search bills..."
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
                <option value="generated">Generated</option>
                <option value="partial_paid">Partial Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
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

      {/* Bills Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Bill #</th>
                  <th className="table-header-cell">Patient</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Amount</th>
                  <th className="table-header-cell">Paid</th>
                  <th className="table-header-cell">Balance</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {billingData?.bills?.length > 0 ? (
                  billingData.bills.map((bill) => {
                    const PaymentIcon = getPaymentMethodIcon(bill.billingInfo?.paymentMethod);
                    return (
                      <tr key={bill._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <PaymentIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">
                                {bill.billNumber}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {bill.billingInfo?.paymentMethod?.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {bill.patient?.personalInfo?.firstName} {bill.patient?.personalInfo?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {bill.patient?.personalInfo?.phone}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm text-gray-900">
                            {format(new Date(bill.billingInfo?.date), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{bill.financials?.totalAmount?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm text-gray-900">
                            ₹{bill.financials?.paidAmount?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className={`text-sm font-medium ${
                            bill.financials?.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ₹{bill.financials?.balanceAmount?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${getStatusColor(bill.billingInfo?.status)} capitalize`}>
                            {bill.billingInfo?.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button className="btn btn-sm btn-outline">
                              View
                            </button>
                            {(bill.billingInfo?.status === 'generated' || bill.billingInfo?.status === 'partial_paid') && 
                             hasPermission('billing.update') && (
                              <button
                                onClick={() => handleAddPayment(bill._id)}
                                className="btn btn-sm btn-success"
                              >
                                Pay
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
                        <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No bills found</p>
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
      {billingData?.pagination && billingData.pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((billingData.pagination.current - 1) * 10) + 1} to{' '}
            {Math.min(billingData.pagination.current * 10, billingData.pagination.total)} of{' '}
            {billingData.pagination.total} results
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
              Page {billingData.pagination.current} of {billingData.pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === billingData.pagination.pages}
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

export default Billing;
