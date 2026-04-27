import React, { useState } from 'react';
import { useAuth, api } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import {
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/reports/dashboard');
      return response.data.dashboard;
    },
    {
      staleTime: 5 * 60 * 1000, 
    }
  );

  const stats = [
    {
      name: 'Today\'s Appointments',
      value: dashboardData?.clinic?.todayAppointments || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
      permission: 'appointments.read',
      link: '/appointments'
    },
    {
      name: 'Total Patients',
      value: dashboardData?.patients?.total || 0,
      icon: UserGroupIcon,
      color: 'bg-emerald-500',
      permission: 'patients.read',
      link: '/patients'
    },
    {
      name: 'Revenue (MTD)',
      value: `₹${(dashboardData?.billing?.revenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-indigo-500',
      permission: 'billing.read',
      link: '/billing'
    },
    {
      name: 'Pending Claims',
      value: dashboardData?.insurance?.byStatus?.submitted?.count || 0,
      icon: ShieldCheckIcon,
      color: 'bg-rose-500',
      permission: 'insurance.read',
      link: '/insurance'
    },
  ];

  const visibleStats = stats.filter(stat => 
    !stat.permission || hasPermission(stat.permission)
  );

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/patients?search=${encodeURIComponent(globalSearch)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4 border-primary-500"></div>
          <p className="text-gray-500 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
        <div className="text-red-500 mb-4 flex justify-center">
          <ShieldCheckIcon className="h-16 w-16" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to load dashboard</h3>
        <p className="text-gray-600 mb-6">There was an error connecting to the clinical servers.</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1 font-medium">
            Welcome back, <span className="text-primary-600 font-bold">{user?.firstName}</span>! Ready for today's consultations?
          </p>
        </div>
        
        {/* Global Search */}
        <form onSubmit={handleGlobalSearch} className="md:w-96">
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search patients by name or ID..." 
                    className="form-input pl-10 h-11 bg-white border-gray-100 shadow-sm rounded-xl focus:ring-primary-500"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                />
            </div>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visibleStats.map((stat) => (
          <button 
            key={stat.name} 
            onClick={() => navigate(stat.link)}
            className="card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left w-full group"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-4 rounded-2xl ${stat.color} shadow-lg shadow-opacity-20 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <PlusIcon className="h-5 w-5 mr-2 text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasPermission('appointments.create') && (
            <QuickActionCard
              title="New Appointment" description="Schedule a patient visit" icon={CalendarIcon} color="bg-blue-500"
              onClick={() => navigate('/appointments')}
            />
          )}
          {hasPermission('patients.create') && (
            <QuickActionCard
              title="Register Patient" description="Add new medical record" icon={UserGroupIcon} color="bg-emerald-500"
              onClick={() => navigate('/patients')}
            />
          )}
          {hasRole('doctor') && (
            <QuickActionCard
              title="My Reports" description="Clinical performance summary" icon={ClipboardDocumentCheckIcon} color="bg-purple-500"
              onClick={() => navigate('/reports')}
            />
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Appointments */}
        {hasPermission('appointments.read') && (
          <div className="card h-full">
            <div className="card-header flex justify-between items-center px-6 py-5 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <ClockIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="card-body p-6">
              <div className="space-y-4">
                {dashboardData?.appointments?.byStatus?.completed > 0 ? (
                  <div className="flex items-center p-4 bg-green-50 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100/50 transition-colors" onClick={() => navigate('/appointments?status=completed')}>
                    <CheckCircleIcon className="h-10 w-10 text-green-500 mr-4" />
                    <div>
                      <p className="font-bold text-green-900">{dashboardData.appointments.byStatus.completed} Consultations</p>
                      <p className="text-sm text-green-700">Successfully completed today</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <ClockIcon className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium font-italic">No consultations completed yet today</p>
                  </div>
                )}
                
                {dashboardData?.appointments?.byStatus?.waiting > 0 && (
                   <div className="flex items-center p-4 bg-yellow-50 rounded-xl border border-yellow-100 mt-4 cursor-pointer hover:bg-yellow-100/50 transition-colors" onClick={() => navigate('/appointments?status=waiting')}>
                    <div className="h-10 w-10 flex items-center justify-center bg-yellow-500 rounded-full text-white font-bold mr-4">
                      {dashboardData.appointments.byStatus.waiting}
                    </div>
                    <div>
                      <p className="font-bold text-yellow-900">Patients Waiting</p>
                      <p className="text-sm text-yellow-700">Ready for consultation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
              <button 
                onClick={() => navigate('/appointments')}
                className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center"
              >
                Go to Appointment Manager →
              </button>
            </div>
          </div>
        )}

        {/* Outstanding Bills */}
        {hasPermission('billing.read') && (
          <div className="card h-full">
            <div className="card-header px-6 py-5 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Financial Summary</h3>
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="card-body p-6">
              <div className="mb-6 cursor-pointer" onClick={() => navigate('/billing')}>
                 <p className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-1">Clinic Revenue (MTD)</p>
                 <p className="text-4xl font-black text-gray-900">₹{(dashboardData?.billing?.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-3">
                {dashboardData?.billing?.outstandingBills > 0 ? (
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg text-sm cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate('/billing?status=unpaid')}>
                    <span className="text-red-700 font-medium">Outstanding Bills</span>
                    <span className="font-black text-red-900">{dashboardData.billing.outstandingBills}</span>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 font-medium">✓ All recent bills are processed</p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
              <button 
                onClick={() => navigate('/billing')}
                className="text-sm font-bold text-primary-600 hover:text-primary-700"
              >
                View Billing Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-start p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 text-left w-full group"
  >
    <div className={`p-4 rounded-xl ${color} text-white shadow-lg shadow-opacity-30 group-hover:scale-110 transition-transform`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="ml-5">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  </button>
);

const CheckCircleIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default Dashboard;
