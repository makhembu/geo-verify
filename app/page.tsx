'use client';

import { useState, useEffect } from 'react';
import { User, Role } from '@/types';
import LoginView from '@/components/LoginView';
import MobileView from '@/components/MobileView';
import DesktopView from '@/components/DesktopView';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleLogin = async (role: Role) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      
      if (res.ok) {
        const userData = await res.json();
        // For user role, ensure consent is set based on the consent flow
        if (role === 'user') {
          // Update consent in the backend
          await fetch('/api/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.id,
              locationConsent: true,
              dataProcessingConsent: true,
            }),
          });
          userData.consentGiven = true;
          userData.consentTimestamp = Date.now();
        }
        setUser(userData);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
  };

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} isLoading={isLoading} />;
  }

  // Route based on role
  switch (user.role) {
    case 'user':
      return <MobileView user={user} onLogout={handleLogout} />;
    case 'staff':
    case 'business':
    case 'admin':
      return <DesktopView user={user} onLogout={handleLogout} />;
    default:
      return <LoginView onLogin={handleLogin} isLoading={isLoading} />;
  }
}
