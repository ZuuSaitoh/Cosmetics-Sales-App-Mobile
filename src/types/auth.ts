export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

export interface PasswordResetRequest {
  identifier: string;
}

export interface PasswordResetBody {
  token: string;
  newPassword: string;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}
