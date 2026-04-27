import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
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
  PrinterIcon,
  WalletIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash',
    transactionId: '',
    notes: ''
  });

  // Fetch bill details
  const { data: bill, isLoading, error } = useQuery(
    ['bill', id],
    async () => {
      const response = await api.get(`/billing/${id}`);
      return response.data.bill;
    },
    {
      enabled: !!id,
      onSuccess: (data) => {
          setPaymentData(prev => ({ ...prev, amount: parseFloat(data.balanceAmount) }));
      }
    }
  );

  const handleRecordPayment = async (e) => {
      e.preventDefault();
      if (paymentData.amount <= 0) {
          toast.error('Payment amount must be greater than zero');
          return;
      }
      if (paymentData.amount > bill.balanceAmount) {
          toast.error('Payment exceeds remaining balance');
          return;
      }

      setIsSubmitting(true);
      try {
          await api.post(`/billing/${id}/payments`, paymentData);
          toast.success('Payment recorded successfully!');
          setIsPaymentModalOpen(false);
          queryClient.invalidateQueries(['bill', id]);
          queryClient.invalidateQueries(['billing']);
      } catch (error) {
          console.error('Payment error:', error);
          toast.error(error.response?.data?.error || 'Failed to record payment');
      } finally {
          setIsSubmitting(false);
      }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'badge-gray',
      generated: 'badge-blue',
      partial_paid: 'badge-yellow',
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
    const Icon = icons[method] || CurrencyDollarIcon;
    return <Icon className="h-5 w-5 text-gray-400 mr-2" />;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4 border-primary-500"></div>
          <p className="text-gray-500">Retrieving financial statement...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="text-center py-12 card max-w-lg mx-auto mt-12 bg-red-50 border-red-100">
        <div className="text-red-500 mb-4">
          <XCircleIcon className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h3>
        <p className="text-gray-600 mb-6">The requested billing record could not be found or you don't have access.</p>
        <button onClick={() => navigate('/billing')} className="btn btn-primary">Return to Ledger</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* Page Header */}
      <div className="page-header print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/billing')}
              className="mr-4 p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-white shadow-sm border border-transparent hover:border-gray-100 transition-all"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Invoice #{bill.billNumber}</h1>
              <p className="text-sm text-gray-500 font-medium">
                Statement for {bill.patient?.firstName} {bill.patient?.lastName}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button onClick={handlePrint} className="btn btn-outline border-gray-200 bg-white">
              <PrinterIcon className="h-4 w-4 mr-2" /> Print PDF
            </button>
            {bill.status !== 'paid' && hasPermission('billing.update') && (
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="btn btn-primary shadow-lg shadow-primary-200"
              >
                <WalletIcon className="h-4 w-4 mr-2" /> Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Summary */}
          <div className="card shadow-sm">
            <div className="card-header border-b border-gray-50 bg-gray-50/30 flex justify-between items-center py-4 px-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Statement Details</h3>
              <span className={`badge ${getStatusColor(bill.status)} font-black uppercase tracking-tight`}>
                {bill.status}
              </span>
            </div>
            <div className="card-body p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Invoice Date</p>
                    <p className="text-sm font-bold text-gray-900">{format(new Date(bill.billDate || bill.createdAt), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Due Date</p>
                    <p className="text-sm font-bold text-red-600">{bill.dueDate ? format(new Date(bill.dueDate), 'MMM dd, yyyy') : 'On Receipt'}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment Method</p>
                    <div className="flex items-center text-sm font-bold text-gray-900 capitalize italic">
                        {getPaymentMethodIcon(bill.paymentMethod)}
                        {bill.paymentMethod}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment ID</p>
                    <p className="text-sm font-mono text-gray-500 bg-gray-50 px-2 rounded">{bill.id.slice(0,8)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card shadow-sm overflow-hidden">
            <div className="card-header bg-gray-50/30 border-b border-gray-100 flex justify-between items-center py-4 px-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Billable Items</h3>
            </div>
            <div className="card-body p-0">
                <table className="min-w-full">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400">Description</th>
                            <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-gray-400">Qty</th>
                            <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-gray-400">Unit Price</th>
                            <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-gray-400">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {bill.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                    <span className="text-[10px] font-black uppercase text-primary-500 tracking-tight bg-primary-50 px-1 rounded">{item.type}</span>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-600">{item.quantity}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">₹{parseFloat(item.unitPrice).toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 font-mono">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50/50 border-t border-gray-100">
                        <tr>
                            <td colSpan="3" className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-gray-400">Subtotal</td>
                            <td className="px-6 py-3 text-right text-sm font-bold text-gray-900 font-mono">₹{parseFloat(bill.subtotal).toLocaleString()}</td>
                        </tr>
                        {bill.totalDiscount > 0 && (
                             <tr>
                                <td colSpan="3" className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-gray-400 text-red-500 italic">Discounts Applied</td>
                                <td className="px-6 py-3 text-right text-sm font-bold text-red-600 font-mono">-₹{parseFloat(bill.totalDiscount).toLocaleString()}</td>
                            </tr>
                        )}
                        <tr className="bg-white border-y border-gray-100">
                            <td colSpan="3" className="px-6 py-5 text-right text-sm font-black uppercase tracking-widest text-gray-900">Total Amount Charged</td>
                            <td className="px-6 py-5 text-right text-2xl font-black text-primary-600 font-mono">₹{parseFloat(bill.totalAmount).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </div>

          {/* Payment History */}
          {bill.payments?.length > 0 && (
              <div className="card border-l-4 border-emerald-500 shadow-sm">
                  <div className="p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-2" /> Payment History
                    </h3>
                    <div className="space-y-3">
                        {bill.payments.map((pmt, i) => (
                            <div key={pmt.id || i} className="flex justify-between items-center p-3 bg-emerald-50/30 rounded-xl border border-emerald-50">
                                <div>
                                    <p className="text-sm font-bold text-emerald-900 italic">₹{parseFloat(pmt.amount).toLocaleString()} via {pmt.method}</p>
                                    <p className="text-[10px] text-emerald-600 font-medium">{format(new Date(pmt.receivedAt), 'PPP p')}</p>
                                </div>
                                <p className="text-xs font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{pmt.transactionId || 'CASHREC'}</p>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            {/* Balance Card */}
            <div className={`card border-none shadow-xl transition-all ${bill.balanceAmount > 0 ? 'bg-red-600 text-white shadow-red-100' : 'bg-emerald-600 text-white shadow-emerald-100'}`}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-xs font-black uppercase tracking-widest opacity-70">Current Balance</p>
                        <WalletIcon className="h-5 w-5 opacity-70" />
                    </div>
                    <p className="text-4xl font-black mb-2 font-mono">₹{parseFloat(bill.balanceAmount).toLocaleString()}</p>
                    <p className="text-[10px] font-medium opacity-70 italic">
                        {bill.balanceAmount > 0 ? 'Action required for settlement' : 'Account fully settled'}
                    </p>
                </div>
            </div>

            {/* Patient Snapshot */}
            <div className="card shadow-sm overflow-hidden">
                <div className="card-header bg-gray-50/50 border-b border-gray-50 py-3 px-5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Patient Details</h4>
                </div>
                <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-black">
                            {bill.patient?.firstName[0]}{bill.patient?.lastName[0]}
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900">{bill.patient?.firstName} {bill.patient?.lastName}</p>
                            <p className="text-[10px] font-bold text-gray-400 tracking-tight">#{bill.patient?.id.slice(0,8)}</p>
                        </div>
                    </div>
                    <div className="space-y-2 border-t border-gray-50 pt-4">
                         <div className="flex items-center text-xs text-gray-500">
                             <PhoneIcon className="h-3 w-3 mr-2" /> {bill.patient?.phone}
                         </div>
                         <div className="flex items-center text-xs text-gray-500">
                             <UserIcon className="h-3 w-3 mr-2" /> {bill.patient?.gender || 'Not Specified'}
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="bg-primary-600 p-6 text-white text-center">
                    <WalletIcon className="h-12 w-12 mx-auto mb-2 opacity-80" />
                    <h3 className="text-xl font-black tracking-tight">Record Payment</h3>
                    <p className="text-xs font-bold text-primary-100 uppercase tracking-widest mt-1 italic">Balance Due: ₹{parseFloat(bill.balanceAmount).toLocaleString()}</p>
                </div>
                
                <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Payment Amount (₹)</label>
                        <input 
                            type="number" step="0.01" 
                            max={bill.balanceAmount}
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            className="form-input text-2xl font-black font-mono text-center border-gray-100 rounded-2xl bg-gray-50 focus:bg-white transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Method</label>
                        <div className="grid grid-cols-2 gap-2">
                             {['cash', 'card', 'digital', 'insurance'].map(m => (
                                 <button 
                                    key={m} type="button"
                                    onClick={() => setPaymentData(prev => ({ ...prev, method: m }))}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${paymentData.method === m ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                 >
                                     {m}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Transaction / Reference ID</label>
                        <input 
                            type="text" value={paymentData.transactionId}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                            className="form-input text-sm font-bold border-gray-100 rounded-xl"
                            placeholder="Optional reference number..."
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Notes</label>
                        <div className="relative">
                            <ChatBubbleLeftRightIcon className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
                            <textarea 
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                                className="form-input pl-9 text-xs font-medium border-gray-100 rounded-xl min-h-[80px]"
                                placeholder="Any internal notes about this payment..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" onClick={() => setIsPaymentModalOpen(false)}
                            className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-primary-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary-200 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};

// Helper components for missing icons
const PhoneIcon = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

export default BillDetail;
