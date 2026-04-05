import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const Layout = () => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      permission: null,
    },
    {
      name: 'Appointments',
      href: '/appointments',
      icon: CalendarIcon,
      permission: 'appointments.read',
    },
    {
      name: 'Patients',
      href: '/patients',
      icon: UserGroupIcon,
      permission: 'patients.read',
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: CurrencyDollarIcon,
      permission: 'billing.read',
    },
    {
      name: 'Insurance',
      href: '/insurance',
      icon: ShieldCheckIcon,
      permission: 'insurance.read',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: ChartBarIcon,
      permission: 'reports.read',
    },
  ];

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    // Always show all tabs for now - permissions checked at API level
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href) => {
    return location.pathname === href || 
           (href !== '/dashboard' && location.pathname.startsWith(href));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <SidebarContent
            navigation={filteredNavigation}
            user={user}
            isActive={isActive}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent
            navigation={filteredNavigation}
            user={user}
            isActive={isActive}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  type="button"
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="ml-4 lg:ml-0">
                  <h1 className="text-xl font-semibold text-gray-900">ICOMS</h1>
                  <p className="text-sm text-gray-500">Clinic Management System</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex sm:items-center sm:space-x-2">
                  <span className="text-sm text-gray-500">Welcome,</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </span>
                  <span className="badge badge-primary text-xs">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="relative">
                  <Link
                    to="/profile"
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {user?.profile?.avatar ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={user.profile.avatar}
                        alt="Profile"
                      />
                    ) : (
                      <UserCircleIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </Link>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigation, user, isActive, onLogout }) => {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-600">
        <h1 className="text-xl font-bold text-white">ICOMS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 bg-gray-50">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item ${
                active
                  ? 'sidebar-nav-item-active'
                  : 'sidebar-nav-item-inactive'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 ${
                  active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user?.profile?.avatar ? (
              <img
                className="h-8 w-8 rounded-full"
                src={user.profile.avatar}
                alt="Profile"
              />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-3 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Layout;
