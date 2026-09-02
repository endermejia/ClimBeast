import type { Database, Json } from './supabase-generated';

type Tables = Database['public']['Tables'];
export type DatabaseTable = keyof Tables;

export type TableRow<T extends DatabaseTable> = Tables[T]['Row'];
export type TableInsert<T extends DatabaseTable> = Tables[T]['Insert'];
export type TableUpdate<T extends DatabaseTable> = Tables[T]['Update'];

// --- Common DTOs ---
export type UserProfileDto = TableRow<'user_profiles'>;
export type UserProfileUpdateDto = TableUpdate<'user_profiles'>;
export type UserPyramidSlotDto = TableRow<'user_pyramid_slots'>;
export type UserPyramidSlotInsertDto = TableInsert<'user_pyramid_slots'>;
export type RouteDto = TableRow<'routes'>;
export type RouteAscentDto = TableRow<'route_ascents'>;
export type EquipperDto = TableRow<'equippers'>;
export type ParkingDto = TableRow<'parkings'>;
export type ParkingInsertDto = TableInsert<'parkings'>;
export type ParkingUpdateDto = TableUpdate<'parkings'>;
export type TopoDto = TableRow<'topos'>;
export type TopoInsertDto = TableInsert<'topos'>;
export type TopoUpdateDto = TableUpdate<'topos'>;
export type TopoRouteInsertDto = TableInsert<'topo_routes'>;
export type RouteAscentCommentDto = TableRow<'route_ascent_comments'>;
export type ChatMessageDto = TableRow<'chat_messages'>;
export type ChatMessageInsertDto = TableInsert<'chat_messages'>;
export type ChatRoomDto = TableRow<'chat_rooms'>;
export type NotificationDto = TableRow<'notifications'>;
export type NotificationInsertDto = TableInsert<'notifications'>;
export type FollowRequestDto = TableRow<'follow_requests'>;

export type RouteInsertDto = TableInsert<'routes'>;
export type RouteUpdateDto = TableUpdate<'routes'>;
export type RouteAscentInsertDto = TableInsert<'route_ascents'>;
export type RouteAscentUpdateDto = TableUpdate<'route_ascents'>;
export type RouteAscentCommentInsertDto = TableInsert<'route_ascent_comments'>;

export type MaterialCatalogDto = TableRow<'material_catalog'>;
export type MaterialCatalogInsertDto = TableInsert<'material_catalog'>;
export type MaterialCatalogUpdateDto = TableUpdate<'material_catalog'>;

export type AreaMaterialRequestDto = TableRow<'area_material_requests'>;
export type AreaMaterialRequestInsertDto =
  TableInsert<'area_material_requests'>;
export type AreaMaterialRequestUpdateDto =
  TableUpdate<'area_material_requests'>;

export type AreaMaterialRequestItemDto =
  TableRow<'area_material_request_items'>;
export type AreaMaterialRequestItemInsertDto =
  TableInsert<'area_material_request_items'>;
export type AreaMaterialRequestItemUpdateDto =
  TableUpdate<'area_material_request_items'>;

export type AreaDonationDto = TableRow<'area_donations'>;
export type AreaDonationInsertDto = TableInsert<'area_donations'>;
export type AreaDonationUpdateDto = TableUpdate<'area_donations'>;

// --- Database Utilities ---
export { Json };
