import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/auth';
import AppTabs from '@/components/app-tabs';

export default function ProtectedLayout() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return <AppTabs />;
}