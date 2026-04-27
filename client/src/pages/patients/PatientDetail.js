import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useAuth, api } from '../../contexts/AuthContext';

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch patient details
  const { data: patient, isLoading, error } = useQuery(
    ['patient', id],
    async () => {
      const response = await api.get(`/patients/${id}`);
      return response.data.patient;
    },
    {
      enabled: !!id,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4 border-primary-500"></div>
          <p className="text-gray-500 animate-pulse">Retrieving patient record...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl">
        <div className="text-red-500 mb-4 flex justify-center">
          <UserIcon className="h-16 w-16" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Record Not Found</h3>
        <p className="text-gray-600 mb-6">The patient record you are looking for does not exist or is inaccessible.</p>
        <button onClick={() => navigate('/patients')} className="btn btn-outline">Back to Patients</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/patients')} className="mr-6 p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-primary-600 hover:border-primary-100 hover:shadow-lg transition-all">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{patient.firstName} {patient.lastName}</h1>
              <span className={`badge ${getStatusColor(patient.status)} uppercase text-[10px] font-bold tracking-widest`}>
                {patient.status}
              </span>
            </div>
            <p className="text-gray-500 font-medium mt-1">Patient Registry ID: <span className="font-mono text-gray-900">{patient.patientId}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          {hasPermission('appointments.create') && (
            <button onClick={() => navigate('/appointments')} className="btn btn-primary shadow-lg shadow-primary-200">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Info Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="Age" value={`${getAge(patient.dateOfBirth)} years`} subValue={patient.dateOfBirth} icon={CalendarIcon} color="bg-blue-50 text-blue-600" />
              <InfoCard label="Gender" value={patient.gender} subValue="Biological" icon={UserIcon} color="bg-purple-50 text-purple-600" />
              <InfoCard label="Blood Group" value={patient.bloodGroup || 'N/A'} subValue="Critical Info" icon={BeakerIcon} color="bg-red-50 text-red-600" />
              <InfoCard label="Visits" value={patient.statistics?.totalVisits || 0} subValue="Total consultations" icon={ClockIcon} color="bg-emerald-50 text-emerald-600" />
          </div>

          {/* Contact & Address */}
          <div className="card">
            <div className="card-header px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Demographics & Contact</h3>
            </div>
            <div className="card-body p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"><PhoneIcon className="h-5 w-5" /></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</p><p className="font-bold text-gray-900">{patient.phone}</p></div>
                 </div>
                 <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"><EnvelopeIcon className="h-5 w-5" /></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p><p className="font-bold text-gray-900">{patient.email || 'None'}</p></div>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"><MapPinIcon className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</p>
                        <p className="font-bold text-gray-900 italic">
                            {patient.addressStreet ? `${patient.addressStreet}, ${patient.addressCity}` : 'Address not documented'}
                        </p>
                    </div>
                 </div>
                 {patient.emergencyContactName && (
                   <div className="flex items-start gap-4 p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200"><ShieldCheckIcon className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Emergency Contact</p>
                        <p className="font-bold text-amber-900">{patient.emergencyContactName}</p>
                        <p className="text-xs text-amber-700">{patient.emergencyContactPhone} ({patient.emergencyContactRelation})</p>
                    </div>
                 </div>
                 )}
              </div>
            </div>
          </div>

          {/* Medical Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-900">Allergies & Conditions</h3></div>
                <div className="card-body p-6 space-y-6">
                    <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Critical Allergies</p>
                        <div className="flex flex-wrap gap-2">
                            {patient.allergies?.length > 0 ? patient.allergies.map((a, i) => <span key={i} className="badge badge-danger">{a}</span>) : <span className="text-sm text-gray-400 italic">No allergies recorded</span>}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-3">Chronic Conditions</p>
                        <div className="flex flex-wrap gap-2">
                            {patient.chronicConditions?.length > 0 ? patient.chronicConditions.map((c, i) => <span key={i} className="badge badge-primary">{c}</span>) : <span className="text-sm text-gray-400 italic">No chronic conditions</span>}
                        </div>
                    </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-900">Current Medications</h3></div>
                <div className="card-body p-6">
                    {patient.medications?.length > 0 ? (
                      <div className="space-y-3">
                        {patient.medications.map((m, i) => (
                           <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <div><p className="font-bold text-gray-900">{m.name}</p><p className="text-xs text-gray-500">{m.dosage}</p></div>
                             <span className="text-[10px] bg-white px-2 py-1 rounded-lg border border-gray-100 font-bold text-gray-400 uppercase tracking-widest">{m.frequency}</span>
                           </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic py-4 text-center">No active medications documented</p>}
                </div>
              </div>
          </div>

          {/* Visit History */}
          <section className="space-y-4">
             <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-primary-500" />
                Clinical Encounter History
             </h3>
             <div className="card overflow-hidden">
                <div className="card-body p-0">
                    <table className="table">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="table-header-cell text-xs uppercase font-black text-gray-400">Date & Type</th>
                                <th className="table-header-cell text-xs uppercase font-black text-gray-400">Attending Doctor</th>
                                <th className="table-header-cell text-xs uppercase font-black text-gray-400">Notes / Diagnosis</th>
                                <th className="table-header-cell text-xs uppercase font-black text-gray-400 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {patient.visitHistory?.length > 0 ? patient.visitHistory.map((v) => (
                              <tr key={v.id} className="table-row hover:bg-gray-50/50">
                                <td className="table-cell">
                                    <p className="font-bold text-gray-900">{format(new Date(v.appointmentDate), 'MMM dd, yyyy')}</p>
                                    <p className="text-xs text-gray-500 uppercase font-black tracking-tight">{v.type}</p>
                                </td>
                                <td className="table-cell">
                                    <p className="text-sm font-bold text-gray-700">Dr. {v.doctor?.firstName} {v.doctor?.lastName}</p>
                                </td>
                                <td className="table-cell max-w-xs">
                                    <p className="text-sm text-gray-600 line-clamp-2">{v.consultation?.clinicalNotes || 'No notes'}</p>
                                    <p className="text-xs font-bold text-primary-600 mt-1">{v.consultation?.diagnosis}</p>
                                </td>
                                <td className="table-cell text-right">
                                    <span className={`badge ${getStatusColor(v.status)} uppercase text-[9px] font-black`}>{v.status}</span>
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan="4" className="py-10 text-center text-gray-400 italic">No previous clinical encounters found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Billing & Insurance */}
          {patient.insuranceProvider && (
            <div className="card bg-primary-600 text-white shadow-xl shadow-primary-200 border-none">
              <div className="p-6">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-200">Insurance Provider</p>
                        <h3 className="text-xl font-bold mt-1 text-white">{patient.insuranceProvider}</h3>
                    </div>
                    <ShieldCheckIcon className="h-10 w-10 text-primary-300 opacity-50" />
                 </div>
                 <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-200">Policy Number</p>
                        <p className="text-sm font-mono bg-primary-700/50 p-2 rounded-lg mt-1">{patient.insurancePolicyNumber}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-200">Coverage</p>
                            <p className="text-sm font-bold capitalize mt-1">{patient.insuranceCoverageType}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-200">Valid Till</p>
                            <p className="text-sm font-bold mt-1">{patient.insuranceValidTo ? format(new Date(patient.insuranceValidTo), 'MMM yyyy') : 'N/A'}</p>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Financials */}
          <div className="card">
            <div className="card-header px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Financial Overview</h3>
                <TrendingUpIcon className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="card-body p-6 space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Value</p>
                    <p className="text-3xl font-black text-gray-900">₹{(patient.statistics?.totalBilled || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Last Billed</span>
                        <span className="font-bold text-gray-900">{patient.statistics?.lastVisit ? format(new Date(patient.statistics?.lastVisit), 'MMM dd, yyyy') : 'Never'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Upcoming Revenue</span>
                        <span className="font-bold text-emerald-600">₹0.00</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="card">
             <div className="card-header px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-900">Lab Reports & Docs</h3>
                 <DocumentTextIcon className="h-5 w-5 text-gray-400" />
             </div>
             <div className="card-body p-4">
                 {patient.documents?.length > 0 ? (
                    <div className="space-y-2">
                        {patient.documents.map((d, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-3">
                                <DocumentTextIcon className="h-8 w-8 text-primary-500 bg-primary-50 p-1.5 rounded-lg" />
                                <div><p className="text-sm font-bold text-gray-900 line-clamp-1">{d.name}</p><p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{d.type}</p></div>
                             </div>
                             <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400 italic">No documents attached</p>
                        <button className="text-xs text-primary-600 font-bold mt-2 uppercase tracking-wide hover:underline">+ Upload Report</button>
                    </div>
                 )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, subValue, icon: Icon, color }) => (
    <div className="card border-none shadow-sm group hover:shadow-xl transition-all duration-300">
        <div className="p-5 flex flex-col items-center text-center">
            <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mb-4 transition-transform group-hover:rotate-12`}>
                <Icon className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-500 font-medium">{subValue}</p>
        </div>
    </div>
);

const TrendingUpIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const ArrowRightIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

export default PatientDetail;
