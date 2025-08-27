import React from 'react';
import type { CurrentUser } from '../types';
import { AppView } from '../constants';
import { Role } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import EntrepreneursIcon from './icons/EntrepreneursIcon';
import TransactionsIcon from './icons/TransactionsIcon';
import ReportsIcon from './icons/ReportsIcon';
import GrowthHubIcon from './icons/GrowthHubIcon';
import UserManagementIcon from './icons/UserManagementIcon';

interface SecondaryNavProps {
    currentView: AppView;
    navigateTo: (view: AppView) => void;
    currentUser: CurrentUser;
}

const NavLink = ({
    icon,
    label,
    isActive,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-dark-textSecondary hover:bg-gray-200 dark:hover:bg-dark-primary'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};

const SecondaryNav = ({ currentView, navigateTo, currentUser }: SecondaryNavProps) => {
    if (currentUser?.type !== 'system') {
        return null;
    }

    const navItems = [
        { view: AppView.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.ENTREPRENEURS, label: 'Entrepreneurs', icon: <EntrepreneursIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.TRANSACTIONS, label: 'Transactions', icon: <TransactionsIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.REPORTS, label: 'Reports', icon: <ReportsIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.GROWTH_HUB, label: 'Growth Hub', icon: <GrowthHubIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.USER_MANAGEMENT, label: 'User Management', icon: <UserManagementIcon />, roles: [Role.SUPER_ADMIN] },
    ];
    
    const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser.user.role));

    // Determine active tab, grouping related views
    const getIsActive = (view: AppView) => {
        if (view === AppView.ENTREPRENEURS) {
            return [AppView.ENTREPRENEURS, AppView.ADD_ENTREPRENEUR, AppView.EDIT_ENTREPRENEUR].includes(currentView);
        }
        return currentView === view;
    };


    return (
        <nav className="bg-white dark:bg-dark-secondary shadow-md sticky top-16 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-2 h-14 overflow-x-auto">
                    {visibleNavItems.map(item => (
                         <NavLink
                            key={item.view}
                            label={item.label}
                            icon={item.icon}
                            isActive={getIsActive(item.view)}
                            onClick={() => navigateTo(item.view)}
                        />
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default SecondaryNav;