import "reflect-metadata";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import {
  CreateRouteDto,
  ReorderRouteStopsDto,
  RoutePathDto,
} from "./routes.dto.js";
import { RoutesService } from "./routes.service.js";

const PARAMTYPES_METADATA = "design:paramtypes";

type AuthenticatedRoutesRequest = {
  user: {
    id: string;
  };
};

function getMethodDescriptor(methodName: string): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(
    RoutesController.prototype,
    methodName,
  );
  if (descriptor === undefined) {
    throw new Error(`Missing controller method: ${methodName}`);
  }
  return descriptor;
}

function setParameterTypes(
  methodName: string,
  parameterTypes: unknown[],
): void {
  Reflect.defineMetadata(
    PARAMTYPES_METADATA,
    parameterTypes,
    RoutesController.prototype,
    methodName,
  );
}

export interface RoutesController {
  readonly routesService: RoutesService;
}

export class RoutesController {
  constructor(routesService: RoutesService) {
    Object.assign(this, { routesService });
  }

  create(request: AuthenticatedRoutesRequest, dto: CreateRouteDto) {
    return this.routesService.create(request.user.id, dto);
  }

  findAll(request: AuthenticatedRoutesRequest) {
    return this.routesService.findAll(request.user.id);
  }

  reorder(
    request: AuthenticatedRoutesRequest,
    id: string,
    dto: ReorderRouteStopsDto,
  ) {
    return this.routesService.reorder(request.user.id, id, dto);
  }

  remove(
    request: AuthenticatedRoutesRequest,
    id: string,
    stopIndex: string,
  ) {
    return this.routesService.remove(request.user.id, id, stopIndex);
  }

  nextPickup(request: AuthenticatedRoutesRequest) {
    return this.routesService.nextPickup(request.user.id);
  }

  path(dto: RoutePathDto) {
    return this.routesService.computePath(dto);
  }
}

Controller("routes")(RoutesController);
UseGuards(SupabaseAuthGuard)(RoutesController);
Get("next-pickup")(
  RoutesController.prototype,
  "nextPickup",
  getMethodDescriptor("nextPickup"),
);
Get()(RoutesController.prototype, "findAll", getMethodDescriptor("findAll"));
Post("path")(RoutesController.prototype, "path", getMethodDescriptor("path"));
Post()(RoutesController.prototype, "create", getMethodDescriptor("create"));
Patch(":id/stops/reorder")(
  RoutesController.prototype,
  "reorder",
  getMethodDescriptor("reorder"),
);
Delete(":id/stops/:index")(
  RoutesController.prototype,
  "remove",
  getMethodDescriptor("remove"),
);
Request()(RoutesController.prototype, "create", 0);
Body()(RoutesController.prototype, "create", 1);
setParameterTypes("create", [Object, CreateRouteDto]);
Request()(RoutesController.prototype, "findAll", 0);
setParameterTypes("findAll", [Object]);
Request()(RoutesController.prototype, "reorder", 0);
Param("id")(RoutesController.prototype, "reorder", 1);
Body()(RoutesController.prototype, "reorder", 2);
setParameterTypes("reorder", [Object, String, ReorderRouteStopsDto]);
Request()(RoutesController.prototype, "remove", 0);
Param("id")(RoutesController.prototype, "remove", 1);
Param("index")(RoutesController.prototype, "remove", 2);
setParameterTypes("remove", [Object, String, String]);
Request()(RoutesController.prototype, "nextPickup", 0);
setParameterTypes("nextPickup", [Object]);
Body()(RoutesController.prototype, "path", 0);
setParameterTypes("path", [RoutePathDto]);
Inject(RoutesService)(RoutesController, undefined, 0);
