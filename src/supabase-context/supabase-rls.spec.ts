import { describe, expect, it } from 'vitest';

import rlsPolicies from './supabase-rls.json';

interface RlsPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

describe('Supabase RLS Policies - Indoor Center Management', () => {
  const policies = rlsPolicies as RlsPolicy[];

  const findPolicy = (
    table: string,
    cmd: string,
    policyNameSubstring?: string,
  ) => {
    return policies.find(
      (p) =>
        p.tablename === table &&
        p.cmd === cmd &&
        (!policyNameSubstring ||
          p.policyname
            .toLowerCase()
            .includes(policyNameSubstring.toLowerCase())),
    );
  };

  describe('indoor_routes policies', () => {
    it('allows route creation when can_create_routes is all', () => {
      const insertPolicy = findPolicy('indoor_routes', 'INSERT');
      expect(insertPolicy).toBeDefined();
      expect(insertPolicy!.with_check).toContain(
        "get_indoor_center_permission(center_id, 'can_create_routes'::text) = 'all'::text",
      );
    });

    it('allows route update for creator, routesetter, or center admin', () => {
      const updatePolicy = findPolicy('indoor_routes', 'UPDATE');
      expect(updatePolicy).toBeDefined();
      expect(updatePolicy!.qual).toContain('user_creator_id = auth.uid()');
      expect(updatePolicy!.qual).toContain('is_indoor_center_admin');
      expect(updatePolicy!.qual).toContain('is_indoor_center_routesetter');
    });

    it('allows route delete for route creator or admin', () => {
      const deletePolicy = findPolicy('indoor_routes', 'DELETE');
      expect(deletePolicy).toBeDefined();
      expect(deletePolicy!.qual).toContain('user_creator_id = auth.uid()');
    });
  });

  describe('indoor_topo_routes policies', () => {
    it('allows insert when can_create_lines is all, can_create_routes is all, or user created the route', () => {
      const insertPolicy = findPolicy('indoor_topo_routes', 'INSERT');
      expect(insertPolicy).toBeDefined();
      expect(insertPolicy!.with_check).toContain(
        "can_create_lines'::text) = 'all'::text",
      );
      expect(insertPolicy!.with_check).toContain(
        "can_create_routes'::text) = 'all'::text",
      );
      expect(insertPolicy!.with_check).toContain('indoor_routes');
    });

    it('has explicit with_check on update policy allowing lines to be drawn/saved', () => {
      const updatePolicy = findPolicy('indoor_topo_routes', 'UPDATE');
      expect(updatePolicy).toBeDefined();
      expect(updatePolicy!.with_check).not.toBeNull();
      // qual allows updating when path was null and can_create_lines is all
      expect(updatePolicy!.qual).toContain('path IS NULL');
      expect(updatePolicy!.qual).toContain(
        "can_create_lines'::text) = 'all'::text",
      );
      // with_check does NOT require path to be null on the updated row
      expect(updatePolicy!.with_check).not.toContain('path IS NULL');
      expect(updatePolicy!.with_check).toContain(
        "can_create_lines'::text) = 'all'::text",
      );
      expect(updatePolicy!.with_check).toContain(
        'user_creator_id = auth.uid()',
      );
    });

    it('allows delete by line creator or route creator', () => {
      const deletePolicy = findPolicy('indoor_topo_routes', 'DELETE');
      expect(deletePolicy).toBeDefined();
      expect(deletePolicy!.qual).toContain('user_creator_id = auth.uid()');
      expect(deletePolicy!.qual).toContain('indoor_routes');
    });
  });

  describe('indoor_route_equippers policies', () => {
    it('allows managing equippers when can_create_routes is all or user is creator', () => {
      const allPolicy = findPolicy('indoor_route_equippers', 'ALL');
      expect(allPolicy).toBeDefined();
      expect(allPolicy!.qual).toContain(
        "get_indoor_center_permission(r.center_id, 'can_create_routes'::text) = 'all'::text",
      );
      expect(allPolicy!.qual).toContain('r.user_creator_id = auth.uid()');
    });
  });
});
