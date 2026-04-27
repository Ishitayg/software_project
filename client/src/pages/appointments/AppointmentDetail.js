import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Consultation form state
  const [consultationData, setConsultationData] = useState({
    consultationNotes: '',
    diagnosis: '',
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      weight: '',
      oxygenLevel: '',
    },
    prescription: [],
    consultationDocuments: [],
    followUpDate: '',
  });

  const [newMedication, setNewMedication] = useState({
    medicine: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  // Fetch appointment details
  const { data: appointment, isLoading, error } = useQuery(
    ['appointment', id],
    async () => {
      const response = await api.get(`/appointments/${id}`);
      return response.data.appointment;
    },
    {
      enabled: !!id,
      onSuccess: (data) => {
        setConsultationData({
          consultationNotes: data.consultationNotes || '',
          diagnosis: data.diagnosis || '',
          vitals: data.vitals || {
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            weight: '',
            oxygenLevel: '',
          },
          prescription: data.prescription || [],
          consultationDocuments: data.consultationDocuments || [],
          followUpDate: data.followUpDate ? format(new Date(data.followUpDate), 'yyyy-MM-dd') : '',
        });
      }
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

  const handleCheckIn = async () => {
    try {
      await api.post(`/appointments/${id}/checkin`);
      toast.success('Patient checked in');
      queryClient.invalidateQueries(['appointment', id]);
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error(error.response?.data?.error || 'Failed to check in');
    }
  };

  const handleStartConsultation = async () => {
    try {
      await api.post(`/appointments/${id}/start-consultation`);
      toast.success('Consultation started');
      queryClient.invalidateQueries(['appointment', id]);
    } catch (error) {
      console.error('Start consultation error:', error);
      toast.error(error.response?.data?.error || 'Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!consultationData.diagnosis) {
      toast.error('Diagnosis is required to complete consultation');
      return;
    }

    try {
      await api.post(`/appointments/${id}/complete-consultation`, consultationData);
      toast.success('Consultation completed successfully');
      queryClient.invalidateQueries(['appointment', id]);
    } catch (error) {
      console.error('Complete consultation error:', error);
      toast.error(error.response?.data?.error || 'Failed to complete consultation');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this appointment?')) {
      try {
        await api.delete(`/appointments/${id}`);
        toast.success('Appointment deleted');
        navigate('/appointments');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.error || 'Failed to delete appointment');
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason) {
      try {
        await api.post(`/appointments/${id}/cancel`, { reason });
        toast.success('Appointment cancelled');
        navigate('/appointments');
      } catch (error) {
        console.error('Cancel error:', error);
        toast.error(error.response?.data?.error || 'Failed to cancel');
      }
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const billData = {
        patientId: appointment.patient.id,
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        items: [
          {
            type: 'consultation',
            name: 'Consultation Fee',
            unitPrice: appointment.consultationFee || 500,
            quantity: 1
          }
        ],
        paymentMethod: 'cash'
      };

      const response = await api.post('/billing', billData);
      toast.success('Invoice generated successfully');
      queryClient.invalidateQueries(['appointment', id]);
      navigate(`/billing/${response.data.bill.id}`);
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const addMedication = () => {
    if (!newMedication.medicine || !newMedication.dosage) {
      toast.error('Medicine name and dosage are required');
      return;
    }
    setConsultationData(prev => ({
      ...prev,
      prescription: [...prev.prescription, newMedication]
    }));
    setNewMedication({
      medicine: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
    });
  };

  const removeMedication = (index) => {
    setConsultationData(prev => ({
      ...prev,
      prescription: prev.prescription.filter((_, i) => i !== index)
    }));
  };

  const handleVitalChange = (e) => {
    const { name, value } = e.target;
    setConsultationData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [name]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner-md border-primary-500"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="text-center py-12 card text-red-500">
        <XCircleIcon className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Error loading appointment</h3>
        <p>{error?.message || 'The requested appointment could not be found.'}</p>
        <button onClick={() => navigate('/appointments')} className="btn btn-primary mt-4">
          Back to Appointments
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/appointments')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="page-title">Appointment Details</h1>
              <p className="page-subtitle">
                {format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')} at {appointment.appointmentTime}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {appointment.status === 'scheduled' && hasPermission('appointments.update') && (
              <>
                <button onClick={handleCheckIn} className="btn btn-success">
                  Check In Patient
                </button>
                <button onClick={handleCancel} className="btn btn-danger">
                  Cancel
                </button>
              </>
            )}
            {(hasRole('management') || hasRole('system_admin')) && (
               <button onClick={handleDelete} className="btn border-red-200 text-red-600 hover:bg-red-50">
                 <TrashIcon className="h-4 w-4 mr-2" />
                 Delete
               </button>
            )}
            {/* Doctors can start consultation if patient is waiting or if they are the doctor */}
            {appointment.status === 'waiting' && (hasPermission('appointments.update') || hasRole('doctor')) && (
              <button
                onClick={handleStartConsultation}
                className="btn btn-primary"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Consultation
              </button>
            )}
            {appointment.status === 'completed' && !appointment.billGenerated && hasPermission('billing.create') && (
              <button
                onClick={handleGenerateInvoice}
                className="btn btn-primary"
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                Generate Invoice
              </button>
            )}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Consultation View/Edit */}
          {appointment.status === 'in_consultation' ? (
            <div className="card border-2 border-primary-500 shadow-lg">
              <div className="card-header bg-primary-50">
                <h3 className="section-title text-primary-700">Consultation In Progress</h3>
              </div>
              <div className="card-body space-y-6">
                {/* Vitals */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-1 h-4 bg-primary-500 mr-2 rounded-full"></span>
                    Patient Vitals
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">BP (mmHg)</label>
                      <input 
                        type="text" name="bloodPressure" value={consultationData.vitals.bloodPressure} 
                        onChange={handleVitalChange} placeholder="120/80" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Heart Rate</label>
                      <input 
                        type="text" name="heartRate" value={consultationData.vitals.heartRate} 
                        onChange={handleVitalChange} placeholder="72" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Temp (°F)</label>
                      <input 
                        type="text" name="temperature" value={consultationData.vitals.temperature} 
                        onChange={handleVitalChange} placeholder="98.6" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Weight (kg)</label>
                      <input 
                        type="text" name="weight" value={consultationData.vitals.weight} 
                        onChange={handleVitalChange} placeholder="70" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">SpO2 (%)</label>
                      <input 
                        type="text" name="oxygenLevel" value={consultationData.vitals.oxygenLevel} 
                        onChange={handleVitalChange} placeholder="98" className="form-input text-sm"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Clinical Notes */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label font-semibold">Diagnosis *</label>
                    <textarea 
                      value={consultationData.diagnosis}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, diagnosis: e.target.value }))}
                      rows="4" className="form-input" placeholder="Enter patient diagnosis..."
                    />
                  </div>
                  <div>
                    <label className="form-label font-semibold">Clinical Notes</label>
                    <textarea 
                      value={consultationData.consultationNotes}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, consultationNotes: e.target.value }))}
                      rows="4" className="form-input" placeholder="Observations, symptoms, history..."
                    />
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Prescriptions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-1 h-4 bg-primary-500 mr-2 rounded-full"></span>
                    Prescription
                  </h4>
                  
                  {/* Medication Table */}
                  {consultationData.prescription.length > 0 && (
                    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dosage</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Frequency</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {consultationData.prescription.map((med, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{med.medicine}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{med.dosage}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{med.frequency}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{med.duration}</td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => removeMedication(idx)} className="text-red-500 hover:text-red-700">
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add Medication Form */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500">Medicine</label>
                      <input 
                        type="text" value={newMedication.medicine}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, medicine: e.target.value }))}
                        placeholder="Paracetamol 500mg" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Dosage</label>
                      <input 
                        type="text" value={newMedication.dosage}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                        placeholder="1 tab" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Frequency</label>
                      <input 
                        type="text" value={newMedication.frequency}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                        placeholder="1-0-1" className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <button 
                        type="button" onClick={addMedication}
                        className="btn btn-outline btn-sm w-full py-2 flex items-center justify-center bg-white"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" /> Add
                      </button>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-xs font-medium text-gray-500">Duration</label>
                       <input 
                         type="text" value={newMedication.duration}
                         onChange={(e) => setNewMedication(prev => ({ ...prev, duration: e.target.value }))}
                         placeholder="5 days" className="form-input text-sm"
                       />
                    </div>
                    <div className="md:col-span-3">
                       <label className="text-xs font-medium text-gray-500">Instructions</label>
                       <input 
                         type="text" value={newMedication.instructions}
                         onChange={(e) => setNewMedication(prev => ({ ...prev, instructions: e.target.value }))}
                         placeholder="After food" className="form-input text-sm"
                       />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Lab Reports & Documents */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-1 h-4 bg-primary-500 mr-2 rounded-full"></span>
                    Lab Reports & Documents (Uploaded)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {consultationData.consultationDocuments?.length > 0 ? (
                        consultationData.consultationDocuments.map((doc, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-primary-200 transition-all">
                             <div className="flex items-center">
                               <div className="p-2 bg-primary-100 rounded-lg mr-3">
                                 <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-gray-700">{doc.name}</p>
                                 <p className="text-[10px] text-gray-400 font-medium">Record Created: {format(new Date(doc.uploadedAt), 'MMM dd, p')}</p>
                               </div>
                             </div>
                             <button type="button" onClick={() => {
                               setConsultationData(prev => ({
                                 ...prev,
                                 consultationDocuments: prev.consultationDocuments.filter((_, i) => i !== idx)
                               }));
                             }} className="text-gray-300 hover:text-red-500 p-1">
                               <TrashIcon className="h-4 w-4" />
                             </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <DocumentTextIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No Lab Reports Attached</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-primary-50/30 p-6 rounded-2xl border border-primary-100 h-fit">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">Upload Report Reference</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" id="docName" placeholder="e.g., Complete Blood Count" 
                          className="form-input text-xs rounded-xl bg-white border-primary-100 focus:ring-primary-500"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('docName');
                            if (input.value) {
                              setConsultationData(prev => ({
                                ...prev,
                                consultationDocuments: [...(prev.consultationDocuments || []), { name: input.value, uploadedAt: new Date() }]
                              }));
                              input.value = '';
                              toast.success('Document reference added');
                            }
                          }}
                          className="btn btn-primary px-4 rounded-xl shadow-lg shadow-primary-200/50"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-[9px] text-primary-400 mt-4 leading-relaxed font-medium">
                        * In production, this section integrates with AWS S3 / Cloud Storage for encrypted medical document handling.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label font-semibold">Follow-up Date</label>
                    <input 
                      type="date" 
                      value={consultationData.followUpDate}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, followUpDate: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={handleCompleteConsultation}
                    className="w-full btn btn-success py-4 rounded-2xl shadow-xl shadow-emerald-200 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:-translate-y-1 active:translate-y-0 transition-all border-none bg-emerald-600"
                  >
                    <CheckCircleIcon className="h-6 w-6" />
                    Finalize & Mark Consultation Completed
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Appointment Info */}
              <div className="card">
                <div className="card-header border-b border-gray-100 flex justify-between items-center">
                  <h3 className="section-title">Appointment Information</h3>
                  <span className={`badge ${getStatusColor(appointment.status)} capitalize`}>
                    {appointment.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="form-label text-gray-500">Date & Time</label>
                      <div className="flex items-center text-gray-900 font-medium">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        {format(new Date(appointment.appointmentDate), 'EEEE, MMMM dd, yyyy')}
                      </div>
                      <div className="flex items-center text-gray-900 font-medium mt-1">
                        <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                        {appointment.appointmentTime} ({appointment.duration} mins)
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-gray-500">Type & source</label>
                      <p className="text-sm text-gray-900 capitalize font-medium">
                        {appointment.type?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        Via {appointment.bookingSource?.replace('_', ' ')}
                      </p>
                    </div>
                    {appointment.notes && (
                      <div className="sm:col-span-2">
                        <label className="form-label text-gray-500">Booking Notes</label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md italic">
                          "{appointment.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Consultation Summary (if completed) */}
              {appointment.status === 'completed' && (
                <div className="card border-l-4 border-success-500">
                  <div className="card-header bg-success-50/30">
                    <h3 className="section-title">Consultation Summary</h3>
                  </div>
                  <div className="card-body space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="form-label text-gray-500 uppercase text-xs">Diagnosis</label>
                        <p className="text-sm text-gray-900 font-semibold">{appointment.diagnosis || 'No diagnosis recorded'}</p>
                      </div>
                      <div>
                        <label className="form-label text-gray-500 uppercase text-xs">Clinical Notes</label>
                        <p className="text-sm text-gray-700">{appointment.consultationNotes || 'No notes'}</p>
                      </div>
                    </div>

                    {appointment.vitals && Object.values(appointment.vitals).some(v => v) && (
                      <div>
                         <label className="form-label text-gray-500 uppercase text-xs">Vitals</label>
                         <div className="flex flex-wrap gap-4 mt-1">
                            {appointment.vitals.bloodPressure && <span className="bg-gray-100 px-2 py-1 rounded text-xs">BP: {appointment.vitals.bloodPressure}</span>}
                            {appointment.vitals.heartRate && <span className="bg-gray-100 px-2 py-1 rounded text-xs">HR: {appointment.vitals.heartRate}</span>}
                            {appointment.vitals.temperature && <span className="bg-gray-100 px-2 py-1 rounded text-xs">T: {appointment.vitals.temperature}°F</span>}
                            {appointment.vitals.weight && <span className="bg-gray-100 px-2 py-1 rounded text-xs">W: {appointment.vitals.weight}kg</span>}
                         </div>
                      </div>
                    )}

                    {appointment.prescription && appointment.prescription.length > 0 && (
                      <div>
                        <label className="form-label text-gray-500 uppercase text-xs">Prescription</label>
                        <div className="mt-2 space-y-2">
                          {appointment.prescription.map((med, index) => (
                            <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex justify-between">
                              <span><strong>{med.medicine}</strong> - {med.dosage} ({med.frequency})</span>
                              <span className="text-gray-500">{med.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {appointment.consultationDocuments && appointment.consultationDocuments.length > 0 && (
                      <div>
                        <label className="form-label text-gray-500 uppercase text-xs">Lab Reports & Documents</label>
                        <div className="mt-2 space-y-2">
                          {appointment.consultationDocuments.map((doc, index) => (
                            <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-center">
                              <DocumentTextIcon className="h-4 w-4 text-primary-500 mr-2" />
                              <span>{doc.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {appointment.followUpDate && (
                      <div className="pt-4 border-t border-gray-100 text-sm">
                        <span className="text-gray-500">Follow-up suggested on: </span>
                        <span className="font-medium text-primary-600">{format(new Date(appointment.followUpDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Patient Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Patient Profile</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-primary-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-bold text-gray-900">
                    {appointment.patient?.firstName} {appointment.patient?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">Patient ID: {appointment.patient?.id?.slice(0, 8)}</p>
                  <div className="flex mt-2 gap-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <PhoneIcon className="h-3 w-3 mr-1" /> {appointment.patient?.phone}
                    </div>
                    {appointment.patient?.gender && (
                      <div className="flex items-center text-xs text-gray-600">
                        <UserIcon className="h-3 w-3 mr-1" /> {appointment.patient.gender}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/patients/${appointment.patientId}`)}
                className="btn btn-outline btn-sm w-full"
              >
                View Full Medical History
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Doctor Information */}
          <div className="card">
            <div className="card-header bg-gray-50">
              <h3 className="section-title">Assigned Doctor</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-bold">Dr</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500">{appointment.doctor?.specialization}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline / Status */}
          <div className="card">
            <div className="card-header bg-gray-50">
              <h3 className="section-title">Timeline</h3>
            </div>
            <div className="card-body px-4 py-5">
              <ol className="relative border-l border-gray-200">
                <li className="mb-4 ml-4">
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white"></div>
                  <time className="mb-1 text-xs font-normal leading-none text-gray-400">Scheduled</time>
                  <p className="text-sm font-medium text-gray-700">Appointment created</p>
                </li>
                {appointment.checkedInAt && (
                   <li className="mb-4 ml-4">
                    <div className="absolute w-3 h-3 bg-green-400 rounded-full mt-1.5 -left-1.5 border border-white"></div>
                    <time className="mb-1 text-xs font-normal leading-none text-gray-400">
                      {format(new Date(appointment.checkedInAt), 'h:mm a')}
                    </time>
                    <p className="text-sm font-medium text-gray-700">Checked in</p>
                  </li>
                )}
                {appointment.consultationStartTime && (
                   <li className="mb-4 ml-4">
                    <div className="absolute w-3 h-3 bg-blue-400 rounded-full mt-1.5 -left-1.5 border border-white"></div>
                    <time className="mb-1 text-xs font-normal leading-none text-gray-400">
                      {format(new Date(appointment.consultationStartTime), 'h:mm a')}
                    </time>
                    <p className="text-sm font-medium text-gray-700">Consultation started</p>
                  </li>
                )}
                {appointment.consultationEndTime && (
                   <li className="ml-4">
                    <div className="absolute w-3 h-3 bg-success-500 rounded-full mt-1.5 -left-1.5 border border-white"></div>
                    <time className="mb-1 text-xs font-normal leading-none text-gray-400">
                      {format(new Date(appointment.consultationEndTime), 'h:mm a')}
                    </time>
                    <p className="text-sm font-medium text-gray-700">Completed</p>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;
