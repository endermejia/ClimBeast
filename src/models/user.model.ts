import { TuiDay } from '@taiga-ui/cdk';

import { Language, Sex, Theme } from './app-enums.model';
import { EightAnuUser } from './eight-anu-user.model';
import { UserProfileDto } from './supabase-interfaces';

export type UserProfileBasicDto = Pick<
  UserProfileDto,
  'id' | 'name' | 'avatar'
>;

export interface ProfileConfigModel {
  fullName: string;
  bio: string;
  language: Language;
  theme: Theme;
  country: string | null;
  city: string;
  birth_date: TuiDay | null;
  starting_climbing_year: number | null;
  size: number | null;
  sex: Sex | null;
  isPrivate: boolean;
  eightAnuUser: EightAnuUser | null;
  deleteEmail: string;
  messageSound: boolean;
  notificationSound: boolean;
  editingMode: boolean;
  restartFirstSteps: boolean;
}
