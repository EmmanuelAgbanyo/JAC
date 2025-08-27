import React, { useRef, type ChangeEvent } from 'react';
import { AppView } from '../constants';
import Button from './ui/Button';
import type { CurrentUser } from '../types';
import { Role } from '../types';
import ThemeToggle from './ui/ThemeToggle';

interface NavbarProps {
  currentUser: CurrentUser;
  navigateTo: (view: AppView) => void;
  onLogout: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onAskAi: () => void;
}

const Navbar = ({ currentUser, navigateTo, onLogout, onExport, onImport, onAskAi }: NavbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getDisplayName = () => {
    if (currentUser.type === 'system') {
        return `${currentUser.user.username} (${currentUser.user.role})`;
    }
    return currentUser.user.name;
  };
  
  const canImportExport = currentUser.type === 'system' && [Role.SUPER_ADMIN, Role.ADMIN].includes(currentUser.user.role);
  const canAskAi = currentUser.type === 'system' && [Role.SUPER_ADMIN, Role.ADMIN].includes(currentUser.user.role);


  return (
    <header className="bg-primary shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span 
              className="font-bold text-2xl text-white cursor-pointer hover:text-aesYellow transition-colors"
              onClick={() => navigateTo(currentUser.type === 'system' ? AppView.DASHBOARD : AppView.ENTREPRENEUR_DASHBOARD)}
            >
              AES JAC Portal
            </span>
          </div>
          <div className="flex items-center space-x-4">

            <ThemeToggle />

            <div className="flex items-center space-x-2 text-white text-sm">
                <span>Welcome,</span>
                <span className="font-bold">{getDisplayName()}</span>
            </div>
            
            <div className="h-6 border-l border-white/30"></div>

            {canAskAi && (
               <button
                  onClick={onAskAi}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-aesYellow text-aesBlue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-all transform hover:scale-105"
                  title="Ask AI a question about your data"
                >
                  <span>Ask AI</span>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2-2 3-4 3-4s1 2 3 4c2-1 2.657-1.343 2.657-1.343a8 8 0 010 11.314z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
            )}

            {canImportExport && (
              <>
                 <Button variant="ghost" size="sm" onClick={onExport}>Export Data</Button>
                <Button variant="ghost" size="sm" onClick={handleImportClick}>Import Data</Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,.csv,.xlsx,.xls,.pdf"
                  onChange={onImport}
                />
              </>
            )}
            
            <Button variant="secondary" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;