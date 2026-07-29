import { ClimbingKind } from './app-enums.model';
import { IndoorRouteDto } from './indoor.model';
import {
  RouteAscentDto,
  RouteDto,
  UserProfileDto,
} from './supabase-interfaces';

// ---- Home Feed Queries ----

/** Raw response from route_ascents query with joined route/crag/area */
export interface AscentWithRouteJoin {
  id: string | number;
  user_id: string;
  date: string | null;
  rate: number | null;
  type: string;
  comment: string | null;
  user: UserProfileDto | null;
  route: RouteWithCragJoin | null;
}

/** Route with nested crag and area */
export interface RouteWithCragJoin extends RouteDto {
  crag: CragWithAreaJoin | null;
}

/** Crag with nested area */
export interface CragWithAreaJoin {
  id: number;
  name: string;
  slug: string;
  area_id: number;
  area: AreaBasic | null;
}

/** Basic area info */
export interface AreaBasic {
  id: number;
  name: string;
  slug: string;
}

/** Processed active crag for home feed */
export interface ActiveCrag {
  id: number;
  name: string;
  slug: string;
  area_slug: string;
}

// ---- Indoor Ascent Queries ----

/** Raw indoor ascent with joined route/center */
export interface IndoorAscentWithRouteJoin {
  id: string | number;
  user_id: string;
  date: string | null;
  rate: number | null;
  type: string;
  comment: string | null;
  user: UserProfileDto | null;
  route: IndoorRouteWithCenterJoin | null;
}

/** Indoor route with nested center */
export interface IndoorRouteWithCenterJoin extends IndoorRouteDto {
  center: IndoorCenterBasic | null;
}

/** Basic indoor center info */
export interface IndoorCenterBasic {
  id: string;
  name: string;
  slug: string;
}

// ---- Area Admin Queries ----

/** Area admin mapping result */
export interface AreaAdminMapping {
  user_id: string;
}

/** Admin user profile basic info */
export interface AdminUserProfile {
  id: string;
  name: string;
  avatar: string | null;
}

/** Combined admin info with user profile */
export interface AreaAdminWithUser {
  user_id: string;
  user: AdminUserProfile;
}

// ---- Route Queries ----

/** Route search result with basic crag info */
export interface RouteSearchResult {
  id: number;
  name: string;
  slug: string;
  grade: number;
  climbing_kind: ClimbingKind | null;
  crag: {
    id: number;
    name: string;
    slug: string;
  };
}

// ---- Equipper Queries ----

/** Equipper route with all joins */
export interface EquipperRouteWithJoins {
  route:
    | (RouteDto & {
        liked: { id: number }[];
        project: { id: number }[];
        ascents: { rate: number | null; type: string }[];
        own_ascent: RouteAscentDto[];
        crag: {
          id: number;
          name: string;
          slug: string;
          area: { id: number; name: string; slug: string } | null;
        } | null;
        route_equippers: { equipper: { id: number; name: string }[] }[];
        topo_routes: {
          topo: { id: number; name: string; slug: string };
        }[];
      })
    | null;
}

/** Indoor equipper route with joins */
export interface IndoorEquipperRouteWithJoins {
  route:
    | (IndoorRouteDto & {
        equippers: { equipper: { id: number; name: string }[] }[];
        center?: { name: string; slug: string };
      })
    | null;
}

// ---- Crag Routes Query ----

/** Crag route with all necessary joins */
export interface CragRouteWithJoins extends RouteDto {
  liked: { id: number }[];
  project: { id: number }[];
  ascents: { rate: number | null; type: string }[];
  own_ascent: RouteAscentDto[];
  topo_routes: {
    topo: { id: number; name: string; slug: string };
  }[];
  route_equippers: { equipper: { id: number; name: string }[] }[];
  crag: {
    slug: string;
    name: string;
    area_id: number;
    area: { slug: string; name: string } | null;
  } | null;
}
