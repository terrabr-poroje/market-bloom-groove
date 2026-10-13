import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'supplier' | 'seller' | 'buyer';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setRoles([]); return; }
    supabase.from('user_roles').select('role').then(({ data }) => {
      setRoles(((data ?? []) as { role: AppRole }[]).map(row => row.role));
    });
  }, [session]);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    isAdmin: roles.includes('admin'),
    canAnnounce: roles.includes('supplier') || roles.includes('seller') || roles.includes('admin'),
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
