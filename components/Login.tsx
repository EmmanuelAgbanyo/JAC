import React, { useState } from 'react';
import type { Entrepreneur, CurrentUser, User } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';

interface LoginProps {
  onLogin: (user: CurrentUser) => void;
  entrepreneurs: Entrepreneur[];
  users: User[];
}

const Login = ({ onLogin, entrepreneurs, users }: LoginProps) => {
  const [activeTab, setActiveTab] = useState<'system' | 'entrepreneur'>('system');
  
  // State for System User Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // State for Entrepreneur Login
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  
  const handleSystemLogin = () => {
    setError('');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.password === password) {
        onLogin({ type: 'system', user });
    } else {
        setError('Invalid username or password.');
    }
  };

  const handleEntrepreneurLogin = () => {
    const entrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
    if (entrepreneur) {
      onLogin({ type: 'entrepreneur', user: entrepreneur });
    }
  };
  
  const entrepreneurOptions = entrepreneurs.map(e => ({
    value: e.id,
    label: `${e.name} (${e.businessName})`
  }));
  
  const TabButton = ({ isActive, onClick, children }: { isActive: boolean, onClick: () => void, children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`w-1/2 py-3 text-center font-semibold transition-colors duration-200 focus:outline-none ${
        isActive
          ? 'border-b-2 border-primary text-primary'
          : 'text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-text'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-primary flex flex-col animate-fadeIn">
      <main className="flex-grow w-full flex items-center justify-center p-4">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-dark-secondary shadow-2xl rounded-lg overflow-hidden">
          
          {/* Left Column - Branding */}
          <div className="p-8 md:p-12 bg-primary text-white flex flex-col justify-center order-last lg:order-first">
            <img src="https://aesghana.org/wp-content/uploads/2021/04/AES-LOGO-Final.png" alt="AES Logo" className="w-48 mb-6" />
            <h1 className="font-lorin text-4xl font-bold mb-4 text-aesYellow">
              AES Just-A-Call (JAC) Portal
            </h1>
            <p className="text-lg opacity-90 mb-6 border-l-4 border-aesYellow pl-4">
              Empowering entrepreneurs through data-driven insights. The JAC Portal is your dedicated tool for tracking business performance, generating professional reports, and unlocking strategic growth opportunities.
            </p>
            <div className="mt-auto pt-6 border-t border-white/20">
              <p className="text-sm font-semibold">A project by the <span className="text-aesYellow">African Entrepreneurship School</span>, dedicated to fostering sustainable businesses and driving social impact across the continent.</p>
            </div>
          </div>
          
          {/* Right Column - Login Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-2 font-lorin">
              Welcome Back
            </h2>
            <p className="text-gray-600 dark:text-dark-textSecondary mb-6">
              Please select your role to continue.
            </p>

            <div className="mb-6 flex border-b dark:border-dark-border">
              <TabButton isActive={activeTab === 'system'} onClick={() => setActiveTab('system')}>Staff / Admin</TabButton>
              <TabButton isActive={activeTab === 'entrepreneur'} onClick={() => setActiveTab('entrepreneur')}>Entrepreneur</TabButton>
            </div>

            {activeTab === 'system' && (
              <div className="space-y-4 animate-fadeIn">
                <Input
                  label="Username"
                  id="username"
                  placeholder="e.g., john.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleSystemLogin}
                  className="w-full"
                  disabled={!username || !password}
                >
                  Login
                </Button>
              </div>
            )}
            
            {activeTab === 'entrepreneur' && (
              <div className="space-y-4 animate-fadeIn">
                <Select
                  label="Select Your Profile"
                  id="entrepreneur-select"
                  options={entrepreneurOptions}
                  value={selectedEntrepreneurId}
                  onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
                  required
                />
                <Button
                  variant="warning"
                  size="lg"
                  onClick={handleEntrepreneurLogin}
                  disabled={!selectedEntrepreneurId}
                  className="w-full"
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center p-4 text-gray-500 dark:text-dark-textSecondary text-sm">
        © {new Date().getFullYear()} African Entrepreneurship School. All Rights Reserved. | <a href="https://aesghana.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary">aesghana.org</a>
      </footer>
    </div>
  );
};

export default Login;