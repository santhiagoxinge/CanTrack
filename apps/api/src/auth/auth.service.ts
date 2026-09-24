import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants.js";
import { LoginDto, ResetPasswordDto, SignupDto } from "./auth.dto.js";

export interface AuthService {
  readonly supabase: SupabaseClient;
}

export class AuthService {
  constructor(supabase: SupabaseClient) {
    Object.assign(this, { supabase });
  }

  async signup(dto: SignupDto) {
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          role: dto.role,
        },
      },
    });

    if (error !== null) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error !== null || data.session === null) {
      throw new UnauthorizedException(error?.message ?? "Invalid login credentials.");
    }

    return data.session;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo:
        process.env.AUTH_RESET_REDIRECT_URL ??
        "http://localhost:5173/reset-password",
    });

    if (error !== null) {
      throw new BadRequestException(error.message);
    }

    return { message: "Password reset email sent." };
  }
}

Injectable()(AuthService);
Inject(SUPABASE_CLIENT)(AuthService, undefined, 0);
