import React from 'react';
import { useQuery } from 'react-query';
import { api } from '../../contexts/AuthContext';

const DoctorSelect = ({ value, onChange, clinicId, name = 'doctorId', required = false }) => {
  const { data: doctorsData, isLoading, error } = useQuery(
    ['doctors', clinicId],
    async () => {
      // Use clinicId if provided, otherwise the backend might default to user's clinic
      const url = clinicId 
        ? `/auth/users?role=doctor&clinic=${clinicId}&limit=100` 
        : `/auth/users?role=doctor&limit=100`;
      const response = await api.get(url);
      return response.data.users;
    },
    {
      // Always fetch if possible, or if the user is a system admin they might see all
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading) {
    return (
      <div className="relative">
        <select className="form-select opacity-50 cursor-wait bg-gray-50" disabled>
          <option>Loading clinical staff...</option>
        </select>
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="spinner-sm border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <select className="form-select border-red-300 text-red-500 bg-red-50" disabled>
        <option>Error loading doctors</option>
      </select>
    );
  }

  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`form-select ${!value ? 'text-gray-400' : 'text-gray-900 font-medium'}`}
        required={required}
      >
        <option value="" className="text-gray-400">Select Doctor</option>
        {doctorsData && doctorsData.length > 0 ? (
          doctorsData.map((doctor) => (
            <option key={doctor.id} value={doctor.id} className="text-gray-900 font-medium">
              Dr. {doctor.firstName} {doctor.lastName} ({doctor.specialization || 'Clinical Generalist'})
            </option>
          ))
        ) : (
          <option value="" disabled>No doctors found for this clinic</option>
        )}
      </select>
      {!isLoading && (!doctorsData || doctorsData.length === 0) && (
          <p className="mt-1 text-[10px] text-amber-600 font-bold uppercase tracking-widest italic px-1">
             ⚠️ No active doctor profiles found in ledger
          </p>
      )}
    </div>
  );
};

export default DoctorSelect;
