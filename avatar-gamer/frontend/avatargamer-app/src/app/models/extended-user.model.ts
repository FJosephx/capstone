import { LinkedUser } from '../services/user-link.service';

export interface ExtendedUser extends LinkedUser {
  created_at?: string;
  last_login?: string;
}