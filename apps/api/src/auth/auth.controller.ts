import "reflect-metadata";
import { Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { LoginDto, ResetPasswordDto, SignupDto } from "./auth.dto.js";

const ROUTE_ARGS_METADATA = "__routeArguments__";
const PARAMTYPES_METADATA = "design:paramtypes";
const BODY_ROUTE_ARGUMENT = "3:0";

function bindBodyParameter(
  controller: Function,
  methodName: string,
  dto: new () => object,
): void {
  Reflect.defineMetadata(
    ROUTE_ARGS_METADATA,
    {
      [BODY_ROUTE_ARGUMENT]: {
        index: 0,
        data: undefined,
        pipes: [],
      },
    },
    controller,
    methodName,
  );
  Reflect.defineMetadata(
    PARAMTYPES_METADATA,
    [dto],
    controller.prototype,
    methodName,
  );
}

function getMethodDescriptor(methodName: string): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(
    AuthController.prototype,
    methodName,
  );
  if (descriptor === undefined) {
    throw new Error(`Missing controller method: ${methodName}`);
  }
  return descriptor;
}

export interface AuthController {
  readonly authService: AuthService;
}

export class AuthController {
  constructor(authService: AuthService) {
    Object.assign(this, { authService });
  }

  signup(dto: SignupDto) {
    return this.authService.signup(dto);
  }

  login(dto: LoginDto) {
    return this.authService.login(dto);
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

Controller("auth")(AuthController);
Post("signup")(
  AuthController.prototype,
  "signup",
  getMethodDescriptor("signup"),
);
Post("login")(
  AuthController.prototype,
  "login",
  getMethodDescriptor("login"),
);
HttpCode(HttpStatus.OK)(
  AuthController.prototype,
  "login",
  getMethodDescriptor("login"),
);
Post("reset-password")(
  AuthController.prototype,
  "resetPassword",
  getMethodDescriptor("resetPassword"),
);
HttpCode(HttpStatus.OK)(
  AuthController.prototype,
  "resetPassword",
  getMethodDescriptor("resetPassword"),
);
bindBodyParameter(AuthController, "signup", SignupDto);
bindBodyParameter(AuthController, "login", LoginDto);
bindBodyParameter(AuthController, "resetPassword", ResetPasswordDto);
Inject(AuthService)(AuthController, undefined, 0);
