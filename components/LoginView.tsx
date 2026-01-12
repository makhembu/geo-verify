'use client';

import React, { useState } from 'react';
import { MapPin, Users, Building2, Shield, ChevronRight } from 'lucide-react';
import { Role } from '@/types';

interface Props {
  onLogin: (role: Role) => void;
  isLoading?: boolean;
}

export default function LoginView({ onLogin, isLoading }: Props) {
  const [showConsent, setShowConsent] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [consentChecks, setConsentChecks] = useState({
    location: false,
    dataProcessing: false,
    terms: false,
  });

  const roles: { role: Role; title: string; description: string; icon: React.ReactNode }[] = [
    {
      role: 'user',
      title: 'Explorer',
      description: 'Discover campaigns and earn rewards by visiting locations',
      icon: <Users className="text-blue-600" size={24} />,
    },
    {
      role: 'staff',
      title: 'Staff',
      description: 'Verify customer redemptions and scan QR codes',
      icon: <Shield className="text-green-600" size={24} />,
    },
    {
      role: 'business',
      title: 'Business',
      description: 'Create campaigns and view analytics',
      icon: <Building2 className="text-purple-600" size={24} />,
    },
    {
      role: 'admin',
      title: 'Admin',
      description: 'Full system access and configuration',
      icon: <Shield className="text-red-600" size={24} />,
    },
  ];

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === 'user') {
      setShowConsent(true);
    } else {
      // Non-user roles skip consent for demo
      onLogin(role);
    }
  };

  const handleConsentSubmit = () => {
    if (consentChecks.location && consentChecks.dataProcessing && consentChecks.terms && selectedRole) {
      onLogin(selectedRole);
    }
  };

  const allConsentsGiven = consentChecks.location && consentChecks.dataProcessing && consentChecks.terms;

  if (showConsent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Privacy & Consent</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Before using GeoVerify, please review and accept our data practices
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecks.location}
                onChange={e => setConsentChecks(prev => ({ ...prev, location: e.target.checked }))}
                className="w-5 h-5 mt-0.5"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Location Access</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  I consent to GeoVerify accessing my device location for verification purposes.
                  GPS data is only collected during active verification sessions.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecks.dataProcessing}
                onChange={e => setConsentChecks(prev => ({ ...prev, dataProcessing: e.target.checked }))}
                className="w-5 h-5 mt-0.5"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Data Processing</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  I understand that my location data will be processed on secure servers.
                  Telemetry data is automatically deleted after 24 hours.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecks.terms}
                onChange={e => setConsentChecks(prev => ({ ...prev, terms: e.target.checked }))}
                className="w-5 h-5 mt-0.5"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Terms & Privacy Policy</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  I have read and agree to the Terms of Service and Privacy Policy.
                  I can withdraw consent and delete my data at any time.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm mb-2">Your Rights (GDPR)</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Right to access your data</li>
              <li>• Right to delete your data at any time</li>
              <li>• Right to data portability</li>
              <li>• Right to withdraw consent</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConsent(false);
                setSelectedRole(null);
              }}
              className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              onClick={handleConsentSubmit}
              disabled={!allConsentsGiven || isLoading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MapPin className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">GeoVerify</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Secure location verification for campaigns & rewards
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-zinc-500 text-center mb-4">Select your role to continue</p>
          
          {roles.map(({ role, title, description, icon }) => (
            <button
              key={role}
              onClick={() => handleRoleSelect(role)}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left group"
            >
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
                {icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-zinc-900 dark:text-white">{title}</p>
                <p className="text-sm text-zinc-500">{description}</p>
              </div>
              <ChevronRight className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" size={20} />
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-400 text-center mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
