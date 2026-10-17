/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'city_manager' | 'supplier' | 'seller' | 'buyer';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Auth initialization must always settle; a rejected request must not leave
    // the whole application waiting on its initial loading state forever.
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('[Terrabar auth] Could not restore session:', error);
        setSession(data.session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('[Terrabar auth] Session initialization failed:', error);
        setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
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
        setRolesLoading(false);
        return;
      }

      setRolesLoading(true);
      try {
        // Production schema uses members + member_roles, not user_roles.
        const [
          { data: memberRoleRows, error: memberRoleError },
          { data: adminRows, error: adminError },
        ] = await Promise.all([
          (supabase as any)
            .from('member_roles')
            .select('role_code, approval_status, members!inner(auth_user_id)')
            .eq('approval_status', 'approved')
            .eq('members.auth_user_id', session.user.id),
          (supabase as any)
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
            if (roleCode === 'supplier') nextRoles.add('supplier');
            if (roleCode === 'seller' || roleCode === 'bar_seller') nextRoles.add('seller');
            if (roleCode === 'buyer' || roleCode === 'special_buyer' || roleCode === 'professional_buyer') {
              nextRoles.add('buyer');
            }
          }
        } else {
          console.error('[Terrabar auth] Could not load member roles:', memberRoleError);
        }

        // Only the main administrator receives the global admin UI role.
        if (!adminError) {
          const adminRoleCodes = (adminRows ?? []).map(row => String(row.admin_role).toLowerCase());
          if (adminRoleCodes.some(code => ['main_admin', 'main-administrator', 'admin'].includes(code))) {
            nextRoles.add('admin');
          }
          if (adminRoleCodes.includes('city_manager')) nextRoles.add('city_manager');
        } else {
          console.error('[Terrabar auth] Could not load admin roles:', adminError);
        }

        setRoles([...nextRoles]);
      } catch (error) {
        if (!active) return;
        // Fail closed: a failed role lookup grants no extra permissions, but
        // does not trap the user behind an endless loading indicator.
        console.error('[Terrabar auth] Role lookup failed:', error);
        setRoles([]);
      } finally {
        if (active) setRolesLoading(false);
      }
    }

    void loadRoles();
    return () => { active = false; };
  }, [session]);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading: loading || (Boolean(session?.user) && rolesLoading),
    isAdmin: roles.includes('admin'),
    canAnnounce: roles.includes('supplier') || roles.includes('seller'),
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
