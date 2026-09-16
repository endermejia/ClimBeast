export type UserReportReason =
  'spam' | 'harassment' | 'inappropriate_content' | 'impersonation' | 'other';

export type UserReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface CreateUserReportDto {
  reported_id: string;
  reason: UserReportReason;
  details?: string | null;
}

export interface UserReportDto {
  id: number;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  reason: UserReportReason;
  details: string | null;
  status: UserReportStatus;
}

export interface ReportUserDialogData {
  userId: string;
  userName?: string | null;
  userAvatar?: string | null;
}

export interface UserReportWithDetails extends UserReportDto {
  reporter?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  reported?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}
