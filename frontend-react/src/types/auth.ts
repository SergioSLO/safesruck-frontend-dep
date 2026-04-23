// types/auth.ts — contratos de autenticación

export interface Truck {
  id: number;
  name: string;
  max_weight_kg: number;
  max_height_m: number;
  max_width_m: number;
  max_length_m: number;
  created_at: string;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  company: string | null;
  trucks: Truck[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface TruckPayload {
  name: string;
  max_weight_kg: number;
  max_height_m: number;
  max_width_m: number;
  max_length_m: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  company?: string;
  trucks?: TruckPayload[];
}

export interface LoginPayload {
  email: string;
  password: string;
}
