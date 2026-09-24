import "reflect-metadata";
import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { createClient } from "@supabase/supabase-js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { SupabaseAuthGuard } from "./auth/supabase-auth.guard.js";
import { SUPABASE_CLIENT } from "./supabase/supabase.constants.js";

const appModuleMetadata = {
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthGuard,
    {
      provide: SUPABASE_CLIENT,
      useFactory: () =>
        createClient(
          process.env.SUPABASE_URL ?? "http://localhost:54321",
          process.env.SUPABASE_ANON_KEY ?? "local-anon-key",
        ),
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    },
  ],
};

export class AppModule {}

Module(appModuleMetadata)(AppModule);
