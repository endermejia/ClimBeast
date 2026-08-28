import { UserProfileBasicDto } from './user.model';

export interface PaginatedProfilesResult<T = UserProfileBasicDto> {
  items: T[];
  total: number;
}
