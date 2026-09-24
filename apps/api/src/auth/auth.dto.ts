import { IsEmail, IsIn, IsNotEmpty, IsString } from "class-validator";

export type UserRole = "walker" | "owner";

export class SignupDto {
  email!: string;
  password!: string;
  role!: UserRole;
}

export class LoginDto {
  email!: string;
  password!: string;
}

export class ResetPasswordDto {
  email!: string;
}

IsEmail()(SignupDto.prototype, "email");
IsString()(SignupDto.prototype, "password");
IsNotEmpty()(SignupDto.prototype, "password");
IsIn(["walker", "owner"])(SignupDto.prototype, "role");
IsEmail()(LoginDto.prototype, "email");
IsString()(LoginDto.prototype, "password");
IsNotEmpty()(LoginDto.prototype, "password");
IsEmail()(ResetPasswordDto.prototype, "email");
