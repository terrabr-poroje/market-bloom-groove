import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'supplier' | 'seller' | 'buyer';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      if (!session?.user) {
        setRoles([]);
        return;
      }

      // Production schema uses members + member_roles, not user_roles.
      const [{ data: memberRoleRows, error: memberRoleError }, { data: adminRows, error: adminError }] =
        await Promise.all([
          supabase
            .from('member_roles')
            .select('role_code, approval_status, members!inner(auth_user_id)')
            .eq('approval_status', 'approved')
            .eq('members.auth_user_id', session.user.id),
          supabase
            .from('admin_users')
            .select('admin_role')
            .eq('auth_user_id', session.user.id)
            .eq('is_active', true),
        ]);

      if (!active) return;

      const nextRoles = new Set<AppRole>();
      if (!memberRoleError) {
        for (const row of memberRoleRows ?? []) {
          const roleCode = String(row.role_code).toLowerCase();
          if (roleCode === 'supplier' || roleCode === 'seller' || roleCode === 'buyer') {
            nextRoles.add(roleCode);
          }
        }
      }

      // Only the main administrator receives the global admin UI role.
      if (!adminError && (adminRows ?? []).some(row =>
        ['main_admin', 'main-administrator', 'admin'].includes(String(row.admin_role).toLowerCase())
      )) {
        nextRoles.add('admin');
      }

      setRoles([...nextRoles]);
    }

    void loadRoles();
    return () => { active = false; };
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
