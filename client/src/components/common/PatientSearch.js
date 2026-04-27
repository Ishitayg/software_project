import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { api } from '../../contexts/AuthContext';

const PatientSearch = ({ onSelect, defaultValue = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const searchPatients = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get(`/patients/search/query?q=${encodeURIComponent(query)}`);
        setResults(response.data.patients || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (patient) => {
    setQuery(`${patient.firstName} ${patient.lastName}`);
    setIsOpen(false);
    onSelect(patient);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search patient by name, phone or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="spinner-sm border-primary-500"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-2xl rounded-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
          {results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-primary-50 flex items-center transition-colors border-b last:border-0 border-gray-50"
              onClick={() => handleSelect(patient)}
            >
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold mr-3">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="text-xs text-gray-500 flex items-center mt-0.5">
                   <span className="font-mono bg-gray-100 px-1 rounded mr-2">{patient.patientId}</span>
                   <span>{patient.phone}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-xl rounded-xl border border-gray-100 p-4 text-center text-gray-500 text-sm">
          No patients found matching "{query}"
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
