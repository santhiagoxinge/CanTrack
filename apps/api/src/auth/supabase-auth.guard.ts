import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants.js";

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: unknown;
};

export interface SupabaseAuthGuard {
  readonly supabase: SupabaseClient;
}

export class SupabaseAuthGuard implements CanActivate {
  constructor(supabase: SupabaseClient) {
    Object.assign(this, { supabase });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme?.toLowerCase() !== "bearer" || token === undefined || token === "") {
      throw new UnauthorizedException("A bearer token is required.");
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error !== null || data.user === null) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    request.user = data.user;
    return true;
  }
}

Injectable()(SupabaseAuthGuard);
Inject(SUPABASE_CLIENT)(SupabaseAuthGuard, undefined, 0);
