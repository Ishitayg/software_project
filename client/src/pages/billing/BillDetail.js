import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const BillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch bill details
  const { data: billData, isLoading, error } = useQuery(
    ['bill', id],
    async () => {
      const response = await api.get(`/billing/${id}`);
      return response.data.bill;
    },
    {
      enabled: !!id,
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

  const handleAddPayment = async () => {
    // This would open a modal to add payment
    console.log('Add payment for bill:', id);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill details...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load bill</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  const bill = billData;
  const PaymentIcon = getPaymentMethodIcon(bill.billingInfo?.paymentMethod);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/billing')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="page-title">Bill Details</h1>
              <p className="page-subtitle">
                View and manage billing information
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="btn btn-outline"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            {(bill.billingInfo?.status === 'generated' || bill.billingInfo?.status === 'partial_paid') && 
             hasPermission('billing.update') && (
              <button
                onClick={handleAddPayment}
                className="btn btn-success"
              >
                Add Payment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Bill Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="form-label">Bill Number</label>
                  <div className="flex items-center">
                    <PaymentIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 font-mono">{bill.billNumber}</span>
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <span className={`badge ${getStatusColor(bill.billingInfo?.status)} capitalize`}>
                    {bill.billingInfo?.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="form-label">Bill Date</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(bill.billingInfo?.date), 'EEEE, MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="form-label">Payment Method</label>
                  <p className="text-sm text-gray-900 capitalize">
                    {bill.billingInfo?.paymentMethod?.replace('_', ' ')}
                  </p>
                </div>
                {bill.billingInfo?.dueDate && (
                  <div>
                    <label className="form-label">Due Date</label>
                    <p className="text-sm text-gray-900">
                      {format(new Date(bill.billingInfo.dueDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="form-label">Created By</label>
                  <p className="text-sm text-gray-900">
                    {bill.createdBy?.profile?.firstName} {bill.createdBy?.profile?.lastName}
                  </p>
                </div>
              </div>

              {bill.notes?.internal && (
                <div className="mt-6">
                  <label className="form-label">Internal Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {bill.notes.internal}
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
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    {bill.patient?.personalInfo?.firstName} {bill.patient?.personalInfo?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">Patient ID: {bill.patient?.registrationInfo?.patientId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-900">{bill.patient?.personalInfo?.phone}</span>
                </div>
                {bill.patient?.personalInfo?.email && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-900">{bill.patient?.personalInfo?.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill Items */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Bill Items</h3>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Item</th>
                      <th className="table-header-cell text-right">Qty</th>
                      <th className="table-header-cell text-right">Unit Price</th>
                      <th className="table-header-cell text-right">Discount</th>
                      <th className="table-header-cell text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {bill.items?.map((item, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{item.type}</div>
                          </div>
                        </td>
                        <td className="table-cell text-right">
                          <span className="text-sm text-gray-900">{item.quantity}</span>
                        </td>
                        <td className="table-cell text-right">
                          <span className="text-sm text-gray-900">₹{item.unitPrice}</span>
                        </td>
                        <td className="table-cell text-right">
                          <span className="text-sm text-gray-900">
                            {item.discount > 0 ? `₹${item.discount}` : '-'}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className="text-sm font-medium text-gray-900">₹{item.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="table-cell text-right font-medium text-gray-900">
                        Subtotal
                      </td>
                      <td className="table-cell text-right font-medium text-gray-900">
                        ₹{bill.financials?.subtotal}
                      </td>
                    </tr>
                    {bill.financials?.totalDiscount > 0 && (
                      <tr>
                        <td colSpan="4" className="table-cell text-right font-medium text-gray-900">
                          Total Discount
                        </td>
                        <td className="table-cell text-right font-medium text-red-600">
                          -₹{bill.financials.totalDiscount}
                        </td>
                      </tr>
                    )}
                    {bill.financials?.totalTax > 0 && (
                      <tr>
                        <td colSpan="4" className="table-cell text-right font-medium text-gray-900">
                          Tax
                        </td>
                        <td className="table-cell text-right font-medium text-gray-900">
                          ₹{bill.financials.totalTax}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan="4" className="table-cell text-right font-bold text-gray-900">
                        Total Amount
                      </td>
                      <td className="table-cell text-right font-bold text-gray-900">
                        ₹{bill.financials?.totalAmount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Payment History</h3>
              </div>
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Date</th>
                        <th className="table-header-cell">Method</th>
                        <th className="table-header-cell">Amount</th>
                        <th className="table-header-cell">Received By</th>
                        <th className="table-header-cell">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {bill.payments.map((payment, index) => {
                        const MethodIcon = getPaymentMethodIcon(payment.method);
                        return (
                          <tr key={index} className="table-row">
                            <td className="table-cell">
                              <div className="text-sm text-gray-900">
                                {format(new Date(payment.paymentDate), 'MMM dd, yyyy h:mm a')}
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center">
                                <MethodIcon className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900 capitalize">
                                  {payment.method}
                                </span>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="text-sm font-medium text-green-600">
                                ₹{payment.amount}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-sm text-gray-900">
                                {payment.receivedBy?.profile?.firstName} {payment.receivedBy?.profile?.lastName}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-sm text-gray-500 font-mono">
                                {payment.transactionId || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Adjustments */}
          {bill.adjustments && bill.adjustments.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Adjustments</h3>
              </div>
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Date</th>
                        <th className="table-header-cell">Type</th>
                        <th className="table-header-cell">Amount</th>
                        <th className="table-header-cell">Reason</th>
                        <th className="table-header-cell">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {bill.adjustments.map((adjustment, index) => (
                        <tr key={index} className="table-row">
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {format(new Date(adjustment.createdAt), 'MMM dd, yyyy h:mm a')}
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className={`badge capitalize ${
                              adjustment.type === 'discount' ? 'badge-success' :
                              adjustment.type === 'write_off' ? 'badge-warning' :
                              'badge-danger'
                            }`}>
                              {adjustment.type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`text-sm font-medium ${
                              adjustment.type === 'refund' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {adjustment.type === 'refund' ? '-' : '+'}₹{adjustment.amount}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-gray-900">{adjustment.reason}</span>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-gray-900">
                              {adjustment.approvedBy?.profile?.firstName} {adjustment.approvedBy?.profile?.lastName}
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
          {/* Financial Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Financial Summary</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Amount</span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹{bill.financials?.totalAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Paid Amount</span>
                  <span className="text-sm font-medium text-green-600">
                    ₹{bill.financials?.paidAmount}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Balance</span>
                    <span className={`text-sm font-bold ${
                      bill.financials?.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ₹{bill.financials?.balanceAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Link */}
          {bill.appointment && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Related Appointment</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {format(new Date(bill.appointment.appointmentInfo.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{bill.appointment.appointmentInfo.time}</span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      Dr. {bill.appointment.doctor.profile.firstName} {bill.appointment.doctor.profile.lastName}
                    </span>
                  </div>
                  <div>
                    <span className={`badge ${getStatusColor(bill.appointment.status)} capitalize`}>
                      {bill.appointment.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insurance Information */}
          {bill.insurance && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Insurance</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Provider</label>
                    <p className="text-sm text-gray-900">{bill.insurance.provider}</p>
                  </div>
                  <div>
                    <label className="form-label">Policy Number</label>
                    <p className="text-sm text-gray-900 font-mono">{bill.insurance.policyNumber}</p>
                  </div>
                  <div>
                    <label className="form-label">Claim Status</label>
                    <span className={`badge capitalize ${
                      bill.insurance.claimStatus === 'approved' ? 'badge-success' :
                      bill.insurance.claimStatus === 'pending' ? 'badge-warning' :
                      'badge-primary'
                    }`}>
                      {bill.insurance.claimStatus?.replace('_', ' ')}
                    </span>
                  </div>
                  {bill.insurance.approvedAmount && (
                    <div>
                      <label className="form-label">Approved Amount</label>
                      <p className="text-sm text-gray-900">₹{bill.insurance.approvedAmount}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Status Timeline</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bill Generated</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(bill.billingInfo.date), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                {bill.financials?.paidAmount > 0 && (
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payment Received</p>
                      <p className="text-xs text-gray-500">
                        {bill.payments && bill.payments.length > 0 && 
                          format(new Date(bill.payments[bill.payments.length - 1].paymentDate), 'MMM dd, yyyy h:mm a')
                        }
                      </p>
                    </div>
                  </div>
                )}
                {bill.billingInfo?.status === 'paid' && (
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Fully Paid</p>
                      <p className="text-xs text-gray-500">Bill completed</p>
                    </div>
                  </div>
                )}
                {bill.billingInfo?.status === 'overdue' && (
                  <div className="flex items-center">
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Overdue</p>
                      <p className="text-xs text-gray-500">
                        Due: {format(new Date(bill.billingInfo.dueDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetail;
