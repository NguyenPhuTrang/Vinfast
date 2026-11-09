import { Role } from "../../generated/prisma/enums.js";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}