import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const InsuranceClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch claim details
  const { data: claimData, isLoading, error } = useQuery(
    ['insurance-claim', id],
    async () => {
      const response = await api.get(`/insurance/${id}`);
      return response.data.claim;
    },
    {
      enabled: !!id,
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

  const handleSubmitClaim = async () => {
    try {
      await api.post(`/insurance/${id}/submit`);
      window.location.reload();
    } catch (error) {
      console.error('Submit claim error:', error);
    }
  };

  const handleAddFollowUp = async () => {
    // This would open a modal to add follow-up
    console.log('Add follow-up for claim:', id);
  };

  const handleAddDocument = async () => {
    // This would open a modal to upload documents
    console.log('Add document for claim:', id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading claim details...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load claim</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  const claim = claimData;
  const StatusIcon = getStatusIcon(claim.claimInfo?.status);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/insurance')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="page-title">Insurance Claim Details</h1>
              <p className="page-subtitle">
                Comprehensive insurance claim information and tracking
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {claim.claimInfo?.status === 'draft' && hasPermission('insurance.update') && (
              <button
                onClick={handleSubmitClaim}
                className="btn btn-primary"
              >
                Submit Claim
              </button>
            )}
            {hasPermission('insurance.update') && (
              <>
                <button
                  onClick={handleAddFollowUp}
                  className="btn btn-warning"
                >
                  Add Follow-up
                </button>
                <button
                  onClick={handleAddDocument}
                  className="btn btn-outline"
                >
                  <PaperClipIcon className="h-4 w-4 mr-2" />
                  Add Document
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Claim Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="form-label">Claim Number</label>
                  <div className="flex items-center">
                    <StatusIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 font-mono">{claim.claimNumber}</span>
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <span className={`badge ${getStatusColor(claim.claimInfo?.status)} capitalize`}>
                    {claim.claimInfo?.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="form-label">Submission Date</label>
                  <p className="text-sm text-gray-900">
                    {claim.claimInfo?.submissionDate 
                      ? format(new Date(claim.claimInfo.submissionDate), 'EEEE, MMMM dd, yyyy')
                      : 'Not submitted'
                    }
                  </p>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <span className={`badge capitalize ${
                    claim.claimInfo?.priority === 'urgent' ? 'badge-danger' :
                    claim.claimInfo?.priority === 'high' ? 'badge-warning' :
                    claim.claimInfo?.priority === 'medium' ? 'badge-primary' :
                    'badge-gray'
                  }`}>
                    {claim.claimInfo?.priority}
                  </span>
                </div>
                <div>
                  <label className="form-label">Date of Service</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(claim.claimInfo?.dateOfService), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="form-label">Created By</label>
                  <p className="text-sm text-gray-900">
                    {claim.createdBy?.profile?.firstName} {claim.createdBy?.profile?.lastName}
                  </p>
                </div>
              </div>

              {claim.notes?.internal && (
                <div className="mt-6">
                  <label className="form-label">Internal Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {claim.notes.internal}
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
                    {claim.patient?.personalInfo?.firstName} {claim.patient?.personalInfo?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">Patient ID: {claim.patient?.registrationInfo?.patientId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-900">{claim.patient?.personalInfo?.phone}</span>
                </div>
                {claim.patient?.personalInfo?.email && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-900">{claim.patient?.personalInfo?.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Insurance Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="form-label">Provider</label>
                  <p className="text-sm text-gray-900">{claim.insuranceInfo?.provider}</p>
                </div>
                <div>
                  <label className="form-label">Policy Number</label>
                  <p className="text-sm text-gray-900 font-mono">{claim.insuranceInfo?.policyNumber}</p>
                </div>
                <div>
                  <label className="form-label">Policy Holder</label>
                  <p className="text-sm text-gray-900">{claim.insuranceInfo?.policyHolder}</p>
                </div>
                <div>
                  <label className="form-label">Relationship</label>
                  <p className="text-sm text-gray-900 capitalize">{claim.insuranceInfo?.relationshipToPatient}</p>
                </div>
                {claim.insuranceInfo?.memberId && (
                  <div>
                    <label className="form-label">Member ID</label>
                    <p className="text-sm text-gray-900 font-mono">{claim.insuranceInfo.memberId}</p>
                  </div>
                )}
                {claim.insuranceInfo?.groupNumber && (
                  <div>
                    <label className="form-label">Group Number</label>
                    <p className="text-sm text-gray-900 font-mono">{claim.insuranceInfo.groupNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Claimed Services</h3>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Service Date</th>
                      <th className="table-header-cell">Service Code</th>
                      <th className="table-header-cell">Service Name</th>
                      <th className="table-header-cell">Billed</th>
                      <th className="table-header-cell">Approved</th>
                      <th className="table-header-cell">Denied</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {claim.services?.map((service, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell">
                          <div className="text-sm text-gray-900">
                            {format(new Date(service.serviceDate), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-gray-900 font-mono">{service.serviceCode}</span>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-gray-900">{service.serviceName}</span>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-gray-900">₹{service.billedAmount}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`text-sm font-medium ${
                            service.approvedAmount > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            ₹{service.approvedAmount}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`text-sm font-medium ${
                            service.deniedAmount > 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            ₹{service.deniedAmount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="table-cell text-right font-medium text-gray-900">
                        Total
                      </td>
                      <td className="table-cell text-right font-medium text-gray-900">
                        ₹{claim.claimInfo?.totalClaimAmount}
                      </td>
                      <td className="table-cell text-right font-medium text-green-600">
                        ₹{claim.claimInfo?.approvedAmount}
                      </td>
                      <td className="table-cell text-right font-medium text-red-600">
                        ₹{claim.claimInfo?.totalClaimAmount - claim.claimInfo?.approvedAmount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {claim.timeline && claim.timeline.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Claim Timeline</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {claim.timeline.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          event.action === 'submitted' ? 'bg-blue-500' :
                          event.action === 'approved' ? 'bg-green-500' :
                          event.action === 'rejected' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}>
                          <StatusIcon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {event.action}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(event.performedAt), 'MMM dd, yyyy h:mm a')}
                          </p>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        {event.performedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            By: {event.performedBy.profile?.firstName} {event.performedBy.profile?.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
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
                  <span className="text-sm text-gray-500">Total Claimed</span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹{claim.claimInfo?.totalClaimAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Approved Amount</span>
                  <span className="text-sm font-medium text-green-600">
                    ₹{claim.claimInfo?.approvedAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Patient Responsibility</span>
                  <span className="text-sm font-medium text-orange-600">
                    ₹{claim.claimInfo?.patientResponsibility}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Link */}
          {claim.bill && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Related Bill</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 font-mono">{claim.bill.billNumber}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {format(new Date(claim.bill.billingInfo.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className={`badge ${getStatusColor(claim.bill.billingInfo.status)} capitalize`}>
                      {claim.bill.billingInfo.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {claim.documents && claim.documents.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Documents</h3>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {claim.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center">
                        <PaperClipIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                          </p>
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

          {/* Follow-ups */}
          {claim.followUps && claim.followUps.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Follow-ups</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {claim.followUps.map((followUp, index) => (
                    <div key={index} className="border-l-4 border-yellow-500 pl-4">
                      <div className="flex items-center justify-between">
                        <span className={`badge capitalize ${
                          followUp.status === 'completed' ? 'badge-success' :
                          followUp.status === 'overdue' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {followUp.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(followUp.dueDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">{followUp.description}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">Type: {followUp.type?.replace('_', ' ')}</p>
                      {followUp.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completed: {format(new Date(followUp.completedAt), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Adjudication Information */}
          {claim.adjudication && (
            <div className="card">
              <div className="card-header">
                <h3 className="section-title">Adjudication</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {claim.adjudication.adjudicationDate && (
                    <div>
                      <label className="form-label">Adjudication Date</label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(claim.adjudication.adjudicationDate), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {claim.adjudication.adjudicatedBy && (
                    <div>
                      <label className="form-label">Adjudicated By</label>
                      <p className="text-sm text-gray-900">{claim.adjudication.adjudicatedBy}</p>
                    </div>
                  )}
                  {claim.adjudication.referenceNumber && (
                    <div>
                      <label className="form-label">Reference Number</label>
                      <p className="text-sm text-gray-900 font-mono">{claim.adjudication.referenceNumber}</p>
                    </div>
                  )}
                  {claim.adjudication.denialReasons && claim.adjudication.denialReasons.length > 0 && (
                    <div>
                      <label className="form-label">Denial Reasons</label>
                      <div className="space-y-1">
                        {claim.adjudication.denialReasons.map((reason, index) => (
                          <span key={index} className="badge badge-danger">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {claim.adjudication.paymentDate && (
                    <div>
                      <label className="form-label">Payment Date</label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(claim.adjudication.paymentDate), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {claim.adjudication.paymentReference && (
                    <div>
                      <label className="form-label">Payment Reference</label>
                      <p className="text-sm text-gray-900 font-mono">{claim.adjudication.paymentReference}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsuranceClaimDetail;
