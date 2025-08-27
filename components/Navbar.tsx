
import React, { useRef, type ChangeEvent } from 'react';
import { AppView } from '../constants';
import Button from './ui/Button';

interface NavbarProps {
  navigateTo: (view: AppView) => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onAskAi: () => void;
}

const Navbar = ({ navigateTo, onExport, onImport, onAskAi }: NavbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <span 
              className="font-bold text-2xl text-white cursor-pointer hover:text-aesYellow transition-colors"
              onClick={() => navigateTo(AppView.DASHBOARD)}
            >
              AES JAC Admin
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigateTo(AppView.DASHBOARD)}>Dashboard</Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo(AppView.ENTREPRENEURS)}>Entrepreneurs</Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo(AppView.TRANSACTIONS)}>Transactions</Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo(AppView.REPORTS)}>Reports</Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo(AppView.GROWTH_HUB)}>Growth Hub</Button>
            
            <div className="h-6 border-l border-white/30"></div>

            <Button variant="success" size="sm" onClick={onExport}>Export Data</Button>
            <Button variant="info" size="sm" onClick={handleImportClick}>Import Data</Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.csv,.xlsx,.xls,.pdf"
              onChange={onImport}
            />
            <button
              onClick={onAskAi}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-aesYellow text-aesBlue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-all transform hover:scale-105"
            >
              <span>Ask AI</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 3zM10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM5.5 9.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75z" />
                   <path d="M10 5.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5zM10 12.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5zM5.5 10a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zM12.5 10a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z" transform="rotate(45 10 10)" />
              </svg>
            </button>
          </div>
          {/* Mobile menu button could be added here */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;