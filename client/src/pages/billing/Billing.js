import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import PatientSearch from '../../components/common/PatientSearch';

const Billing = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Invoice State
  const [newBill, setNewBill] = useState({
    patientId: '',
    patientName: '',
    items: [{ type: 'consultation', name: 'Consultation Fee', unitPrice: 500, quantity: 1 }],
    paymentMethod: 'cash',
    notes: '',
  });

  // Fetch bills
  const { data: billingData, isLoading } = useQuery(
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
    }
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-500',
      generated: 'bg-blue-100 text-blue-600',
      partial_paid: 'bg-amber-100 text-amber-600',
      paid: 'bg-emerald-100 text-emerald-600',
      overdue: 'bg-red-100 text-red-600',
      cancelled: 'bg-gray-100 text-gray-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-500';
  };

  const handleAddItem = () => {
    setNewBill(prev => ({
      ...prev,
      items: [...prev.items, { type: 'medicine', name: '', unitPrice: 0, quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setNewBill(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newBill.items];
    newItems[index][field] = value;
    setNewBill(prev => ({ ...prev, items: newItems }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newBill.patientId) {
      toast.error('Please select a patient');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await api.post('/billing', {
        ...newBill,
        clinicId: user.clinicId
      });
      toast.success('Invoice generated successfully!');
      setIsModalOpen(false);
      queryClient.invalidateQueries(['billing']);
      navigate(`/billing/${response.data.bill.id}`);
    } catch (error) {
      console.error('Invoice creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4 border-primary-500"></div>
          <p className="text-gray-500 animate-pulse">Accessing financial records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Revenue & Billing</h1>
            <p className="text-gray-500 font-medium">Tracking clinical revenue and patient settlements</p>
          </div>
          {hasPermission('billing.create') && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary shadow-lg shadow-primary-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-primary-600 text-white border-none shadow-xl shadow-primary-100">
              <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-primary-500 rounded-2xl"><CurrencyDollarIcon className="h-6 w-6 text-white" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-200">System Analytics</span>
                  </div>
                  <p className="text-xs font-bold text-primary-200 uppercase tracking-widest mb-1">Total Outstanding Sum</p>
                  <p className="text-3xl font-black font-mono">₹{billingData?.bills?.reduce((sum, b) => sum + parseFloat(b.balanceAmount), 0).toLocaleString()}</p>
              </div>
          </div>
          <div className="card">
              <div className="p-6">
                  <div className="p-3 bg-emerald-50 rounded-2xl w-fit mb-4 text-emerald-600"><CheckCircleIcon className="h-6 w-6" /></div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Settled Records</p>
                  <p className="text-3xl font-black text-gray-900 font-mono">{billingData?.bills?.filter(b => b.status === 'paid').length}</p>
              </div>
          </div>
          <div className="card">
              <div className="p-6">
                  <div className="p-3 bg-amber-50 rounded-2xl w-fit mb-4 text-amber-600"><ClockIcon className="h-6 w-6" /></div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Accounts</p>
                  <p className="text-3xl font-black text-gray-900 font-mono">{billingData?.pagination?.total || 0}</p>
              </div>
          </div>
      </div>

      {/* Filters */}
      <div className="card shadow-sm border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="card-body p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Search Ledger</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 border-gray-100 focus:border-primary-500 rounded-xl" placeholder="Invoice # or Patient Name..."
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Settlement Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select border-gray-100 rounded-xl">
                <option value="">All Transactions</option>
                <option value="draft">Drafts</option>
                <option value="generated">Open</option>
                <option value="partial_paid">Partial</option>
                <option value="paid">Settled</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="lg:col-span-1 flex items-end">
              <button onClick={() => {setSearchTerm(''); setStatusFilter(''); setPage(1);}} className="btn btn-outline w-full rounded-xl border-gray-100 hover:bg-white">
                <FunnelIcon className="h-4 w-4 mr-2" /> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden shadow-xl shadow-gray-100/50 border-gray-100">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400">Reference</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400">Details</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Liability</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Settled</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Balance</th>
                  <th className="table-header-cell text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {billingData?.bills?.length > 0 ? (
                  billingData.bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-primary-50/30 transition-all cursor-pointer group" onClick={() => navigate(`/billing/${bill.id}`)}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary-500 transition-colors shadow-sm"><DocumentTextIcon className="h-5 w-5" /></div>
                           <div>
                               <p className="text-sm font-black text-gray-900">#{bill.billNumber || bill.id.slice(0,8)}</p>
                               <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full ${getStatusColor(bill.status)}`}>{bill.status}</span>
                           </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="text-sm font-bold text-gray-900 leading-none mb-1">{bill.patient?.firstName} {bill.patient?.lastName}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{bill.patient?.phone}</p>
                      </td>
                      <td className="table-cell">
                        <p className="text-xs font-bold text-gray-500 bg-gray-100 w-fit px-2 py-0.5 rounded-full">{format(new Date(bill.createdAt), 'MMM dd')}</p>
                      </td>
                      <td className="table-cell text-right">
                        <p className="text-sm font-black text-gray-900 font-mono">₹{parseFloat(bill.totalAmount).toLocaleString()}</p>
                      </td>
                      <td className="table-cell text-right">
                        <p className="text-sm font-black text-emerald-600 font-mono">₹{parseFloat(bill.paidAmount).toLocaleString()}</p>
                      </td>
                      <td className="table-cell text-right">
                        <p className={`text-sm font-black font-mono ${parseFloat(bill.balanceAmount) > 0 ? 'text-red-500' : 'text-gray-400'}`}>₹{parseFloat(bill.balanceAmount).toLocaleString()}</p>
                      </td>
                      <td className="table-cell text-right">
                        <div className="p-2 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all">
                            <ArrowRightIcon className="h-5 w-5" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="py-32 text-center bg-gray-50/50">
                      <div className="max-w-xs mx-auto opacity-40">
                        <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">No matching records</p>
                        <p className="text-xs font-medium">Adjust your filters or generate a new invoice</p>
                      </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {billingData?.pagination?.pages > 1 && (
          <div className="flex justify-center gap-2">
              {[...Array(billingData.pagination.pages)].map((_, i) => (
                  <button 
                  key={i} 
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${page === i + 1 ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                  >
                      {i + 1}
                  </button>
              ))}
          </div>
      )}

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-50 flex justify-between items-center text-gray-900">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Generate Invoice</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Direct Settlement Channel</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-50 rounded-xl transition-all"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-8 space-y-8">
              {/* Patient Selection */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">1. Select Recipient</label>
                <PatientSearch 
                  onSelect={(p) => {
                    setNewBill(prev => ({ ...prev, patientId: p.id, patientName: `${p.firstName} ${p.lastName}` }));
                  }} 
                />
                {newBill.patientName && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-100">
                    <CheckCircleIcon className="h-4 w-4" /> Selected: {newBill.patientName}
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 block">2. Billable Items</label>
                    <button type="button" onClick={handleAddItem} className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-1 rounded-lg hover:bg-primary-100 transition-all flex items-center gap-1">
                        <PlusIcon className="h-3 w-3" /> Add Item
                    </button>
                </div>
                
                <div className="space-y-3">
                  {newBill.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="col-span-12 md:col-span-5">
                        <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Description</label>
                        <input 
                            type="text" value={item.name} 
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="form-input text-xs rounded-xl border-gray-100 bg-white" placeholder="Service or Medicine name..." required
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                         <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Type</label>
                         <select 
                            value={item.type} 
                            onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                            className="form-select text-[10px] font-bold rounded-xl border-gray-100 bg-white"
                         >
                             <option value="consultation">Consult</option>
                             <option value="medicine">Medicine</option>
                             <option value="procedure">Proc.</option>
                             <option value="lab_test">Lab</option>
                         </select>
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Unit Price</label>
                        <input 
                            type="number" value={item.unitPrice} 
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="form-input text-xs rounded-xl border-gray-100 bg-white font-mono" required
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Qty</label>
                        <input 
                            type="number" value={item.quantity} 
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="form-input text-xs rounded-xl border-gray-100 bg-white" required
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement Options */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">3. Payment Method</label>
                   <div className="grid grid-cols-2 gap-2">
                       {['cash', 'card', 'digital', 'insurance'].map(method => (
                           <button 
                            key={method} type="button"
                            onClick={() => setNewBill(prev => ({ ...prev, paymentMethod: method }))}
                            className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newBill.paymentMethod === method ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                           >
                               {method}
                           </button>
                       ))}
                   </div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">4. Financial Summary</label>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400">Grand Total</span>
                            <span className="text-xl font-black text-gray-900 font-mono">₹{newBill.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
                >
                    Discard Changes
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-10 py-3 bg-primary-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary-200 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Finalize & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
