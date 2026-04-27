import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { format, subDays } from 'date-fns';
import {
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../contexts/AuthContext';

const Reports = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    ['dashboard-reports', dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/reports/dashboard?${params}`);
      return response.data.dashboard;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch clinic utilization
  const { data: utilizationData, isLoading: utilizationLoading } = useQuery(
    ['clinic-utilization', dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      params.append('groupBy', 'day');
      
      const response = await api.get(`/reports/clinic-utilization?${params}`);
      return response.data.utilization;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch doctor performance
  const { data: performanceData, isLoading: performanceLoading } = useQuery(
    ['doctor-performance', dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/reports/doctor-performance?${params}`);
      return response.data.performance;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery(
    ['revenue-reports', dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      params.append('groupBy', 'day');
      
      const response = await api.get(`/reports/revenue?${params}`);
      return response.data.revenue;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: peakHoursData, isLoading: peakHoursLoading } = useQuery(
    ['peak-hours', dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/reports/peak-hours?${params}`);
      return response.data.peakHours;
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const handleExport = async (reportType, format) => {
    try {
      const params = new URLSearchParams();
      params.append('reportType', reportType);
      params.append('format', format);
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/reports/export/${reportType}?${params}`);
      
      // Create download link
      const blob = new Blob([response.data], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', reportType, error);
    }
  };

  const isLoading = dashboardLoading || utilizationLoading || performanceLoading || revenueLoading || peakHoursLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">
              Comprehensive insights into clinic operations and performance
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="form-input text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="form-input text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
            { id: 'utilization', name: 'Clinic Utilization', icon: UserGroupIcon },
            { id: 'performance', name: 'Doctor Performance', icon: ArrowTrendingUpIcon },
            { id: 'revenue', name: 'Revenue Analysis', icon: CurrencyDollarIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Appointments
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {dashboardData?.appointments?.total || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-green-500">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        New Patients
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {dashboardData?.patients?.new || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-yellow-500">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Revenue
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          ₹{dashboardData?.billing?.revenue?.toLocaleString() || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-purple-500">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completion Rate
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {dashboardData?.appointments?.total > 0 ? 
                            Math.round((dashboardData.appointments.byStatus.completed / dashboardData.appointments.total) * 100) : 0}%
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Export Options */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Export Reports</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => handleExport('dashboard', 'excel')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Dashboard (Excel)
                </button>
                <button
                  onClick={() => handleExport('dashboard', 'pdf')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Dashboard (PDF)
                </button>
                <button
                  onClick={() => handleExport('revenue', 'excel')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Revenue Report (Excel)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinic Utilization Tab */}
      {activeTab === 'utilization' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Clinic Utilization Trends</h3>
              <p className="section-subtitle">
                Daily appointment volume and resource utilization
              </p>
            </div>
            <div className="card-body">
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>Utilization chart would be rendered here</p>
                  <p className="text-sm mt-2">Using Recharts or similar library</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="card-header">
                <h4 className="text-lg font-medium text-gray-900">Peak Hours Analysis</h4>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {peakHoursData?.length > 0 ? (
                    peakHoursData.slice(0, 5).map((item, index) => {
                      const hourStr = `${item.hour}:00 - ${item.hour + 1}:00`;
                      const maxCount = Math.max(...peakHoursData.map(p => p.count));
                      const percentage = Math.round((item.count / maxCount) * 100);
                      
                      return (
                        <div key={item.hour} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{hourStr}</span>
                            <span className="text-xs font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{item.count} appointments</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div 
                              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest italic">No peak hour data for selection</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h4 className="text-lg font-medium text-gray-900">Resource Allocation</h4>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {[
                    { resource: 'Consultation Rooms', utilization: 85 },
                    { resource: 'Diagnostic Equipment', utilization: 72 },
                    { resource: 'Staff Availability', utilization: 90 },
                  ].map((item) => (
                    <div key={item.resource} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.resource}</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${item.utilization}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.utilization}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Doctor</th>
                      <th className="table-header-cell">Total Appointments</th>
                      <th className="table-header-cell">Completed</th>
                      <th className="table-header-cell">Cancelled</th>
                      <th className="table-header-cell">No-Show</th>
                      <th className="table-header-cell">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {performanceData?.length > 0 ? (
                      performanceData.map((doctor) => (
                        <tr key={doctor.doctor.id} className="table-row">
                          <td className="table-cell">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Dr. {doctor.doctor.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {doctor.doctor.specialization}
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {doctor.totalAppointments}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {doctor.completedAppointments}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {doctor.cancelledAppointments}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {doctor.noShowAppointments}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900 mr-2">
                                {doctor.completionRate.toFixed(1)}%
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    doctor.completionRate >= 90 ? 'bg-green-600' : 
                                    doctor.completionRate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${doctor.completionRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-8">
                          <div className="text-gray-500">
                            <UserGroupIcon className="h-12 w-12 mx-auto mb-4" />
                            <p>No performance data available</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Analysis Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-green-500">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Revenue
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          ₹{dashboardData?.billing?.revenue?.toLocaleString() || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-blue-500">
                    <DocumentArrowDownIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Outstanding Amount
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          ₹{(dashboardData?.billing?.outstandingAmount || 0).toLocaleString()}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-purple-500">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Average Bill Amount
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          ₹{dashboardData?.billing?.revenue ? 
                            Math.round(dashboardData.billing.revenue / (dashboardData.billing.billCount || 1)).toLocaleString() : 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-md bg-yellow-500">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Bills
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {dashboardData?.billing?.outstandingBills || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="section-title">Revenue Trends</h3>
              <p className="section-subtitle">
                Daily revenue breakdown over the selected period
              </p>
            </div>
            <div className="card-body">
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center text-gray-400">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="font-medium">Revenue Analysis Visualizer</p>
                  <p className="text-xs">Select data range above to refresh trend analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Reports;
