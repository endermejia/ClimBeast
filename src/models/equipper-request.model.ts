export interface EquipperRequestDto {
  id: number;
  user_id: string;
  equipper_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface EquipperRequestWithDetails extends EquipperRequestDto {
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  equipper: {
    id: number;
    name: string;
    description: string | null;
  };
}
