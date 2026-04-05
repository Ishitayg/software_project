import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import {
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { api } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, hasPermission } = useAuth();

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/reports/dashboard');
      return response.data.dashboard;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const stats = [
    {
      name: 'Today\'s Appointments',
      value: dashboardData?.clinic?.todayAppointments || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
      permission: 'appointments.read',
    },
    {
      name: 'Total Patients',
      value: dashboardData?.patients?.total || 0,
      icon: UserGroupIcon,
      color: 'bg-green-500',
      permission: 'patients.read',
    },
    {
      name: 'Revenue (MTD)',
      value: `₹${(dashboardData?.billing?.revenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
      permission: 'billing.read',
    },
    {
      name: 'Pending Claims',
      value: dashboardData?.insurance?.byStatus?.submitted?.count || 0,
      icon: ShieldCheckIcon,
      color: 'bg-purple-500',
      permission: 'insurance.read',
    },
  ];

  // Filter stats based on permissions
  const visibleStats = stats.filter(stat => 
    !stat.permission || hasPermission(stat.permission)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.profile?.firstName}! Here's what's happening at your clinic today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleStats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasPermission('appointments.create') && (
            <QuickActionCard
              title="Book Appointment"
              description="Schedule a new patient appointment"
              icon={CalendarIcon}
              color="bg-blue-500"
              href="/appointments?action=new"
            />
          )}
          
          {hasPermission('patients.create') && (
            <QuickActionCard
              title="Register Patient"
              description="Add a new patient to the system"
              icon={UserGroupIcon}
              color="bg-green-500"
              href="/patients?action=new"
            />
          )}
          
          {hasPermission('billing.create') && (
            <QuickActionCard
              title="Generate Bill"
              description="Create a new bill for services"
              icon={CurrencyDollarIcon}
              color="bg-yellow-500"
              href="/billing?action=new"
            />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Appointments */}
        {hasPermission('appointments.read') && (
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Recent Appointments</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {dashboardData?.appointments?.byStatus?.completed > 0 ? (
                  <p className="text-sm text-gray-600">
                    {dashboardData.appointments.byStatus.completed} appointments completed today
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No appointments completed today</p>
                )}
              </div>
            </div>
            <div className="card-footer">
              <a
                href="/appointments"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all appointments →
              </a>
            </div>
          </div>
        )}

        {/* Outstanding Bills */}
        {hasPermission('billing.read') && (
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Outstanding Bills</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {dashboardData?.billing?.outstandingBills > 0 ? (
                  <p className="text-sm text-gray-600">
                    {dashboardData.billing.outstandingBills} bills pending payment
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">All bills are paid</p>
                )}
              </div>
            </div>
            <div className="card-footer">
              <a
                href="/billing"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View billing →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="mt-8">
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">System Status</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Database</p>
                  <p className="text-sm text-gray-500">Connected</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">API Server</p>
                  <p className="text-sm text-gray-500">Operational</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Last Sync</p>
                  <p className="text-sm text-gray-500">Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, color, href }) => {
  return (
    <a
      href={href}
      className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
    </a>
  );
};

export default Dashboard;
