import React, { useRef, useState, type ChangeEvent } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const renderNavLinks = () => (
    <div className="flex flex-col md:flex-row items-stretch md:items-center md:space-x-4">
      <div className="flex items-center space-x-2 text-white text-sm px-3 py-2">
        <span>Welcome,</span>
        <span className="font-bold">{getDisplayName()}</span>
      </div>
      
      <div className="h-auto w-full md:w-auto md:h-6 border-b md:border-b-0 md:border-l border-white/30 my-2 md:my-0"></div>

      {canAskAi && (
        <div className="px-3 py-2">
          <button
            onClick={() => { onAskAi(); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-aesYellow text-aesBlue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-all transform hover:scale-105"
            title="Ask AI a question about your data"
          >
            <span>Ask AI</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2-2 3-4 3-4s1 2 3 4c2-1 2.657-1.343 2.657-1.343a8 8 0 010 11.314z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {canImportExport && (
        <>
          <div className="px-3 py-2"><Button variant="ghost" size="sm" onClick={() => { onExport(); setIsMobileMenuOpen(false); }} className="w-full">Export Data</Button></div>
          <div className="px-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => { handleImportClick(); setIsMobileMenuOpen(false); }} className="w-full">Import Data</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv,.xlsx,.xls,.pdf" onChange={onImport} />
          </div>
        </>
      )}
      
      <div className="px-3 py-2 border-t border-white/20 md:border-0 md:p-0">
        <Button variant="secondary" size="sm" onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full md:w-auto">Logout</Button>
      </div>
    </div>
  );


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
          <div className="flex items-center">
            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
              {renderNavLinks()}
            </div>
             <div className="md:hidden flex items-center space-x-2">
               <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/20 focus:outline-none"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

       {isMobileMenuOpen && (
        <div className="md:hidden absolute w-full bg-primary-hover shadow-lg" id="mobile-menu">
           <div className="py-2">
            {renderNavLinks()}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
