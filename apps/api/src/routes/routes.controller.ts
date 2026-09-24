import "reflect-metadata";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import { EmbeddingDto } from "../dogs/dogs.dto.js";
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

type CheckinHttpResponse = {
  status(code: number): unknown;
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

  async checkIn(
    request: AuthenticatedRoutesRequest,
    id: string,
    dto: EmbeddingDto,
    response: CheckinHttpResponse,
  ) {
    const result = await this.routesService.checkIn(
      request.user.id,
      id,
      dto,
    );
    response.status(
      result.autoConfirmed ? HttpStatus.CREATED : HttpStatus.OK,
    );
    return result;
  }

  undoCheckIn(request: AuthenticatedRoutesRequest, id: string) {
    return this.routesService.undoCheckIn(request.user.id, id);
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
Post(":id/checkin")(
  RoutesController.prototype,
  "checkIn",
  getMethodDescriptor("checkIn"),
);
Post()(RoutesController.prototype, "create", getMethodDescriptor("create"));
Patch(":id/stops/reorder")(
  RoutesController.prototype,
  "reorder",
  getMethodDescriptor("reorder"),
);
Delete(":id/checkin/undo")(
  RoutesController.prototype,
  "undoCheckIn",
  getMethodDescriptor("undoCheckIn"),
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
Request()(RoutesController.prototype, "checkIn", 0);
Param("id")(RoutesController.prototype, "checkIn", 1);
Body()(RoutesController.prototype, "checkIn", 2);
Res({ passthrough: true })(RoutesController.prototype, "checkIn", 3);
setParameterTypes("checkIn", [Object, String, EmbeddingDto, Object]);
Request()(RoutesController.prototype, "undoCheckIn", 0);
Param("id")(RoutesController.prototype, "undoCheckIn", 1);
setParameterTypes("undoCheckIn", [Object, String]);
Inject(RoutesService)(RoutesController, undefined, 0);
