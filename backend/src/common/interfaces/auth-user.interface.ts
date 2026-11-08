import type { Role } from '../enums/role.enum.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}