import "reflect-metadata";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import { CreateDogDto, EmbeddingDto, UpdateDogDto } from "./dogs.dto.js";
import { DogsService } from "./dogs.service.js";

const PARAMTYPES_METADATA = "design:paramtypes";

type AuthenticatedDogsRequest = {
  user: {
    id: string;
  };
};

function getMethodDescriptor(methodName: string): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(
    DogsController.prototype,
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
    DogsController.prototype,
    methodName,
  );
}

export interface DogsController {
  readonly dogsService: DogsService;
}

export class DogsController {
  constructor(dogsService: DogsService) {
    Object.assign(this, { dogsService });
  }

  create(request: AuthenticatedDogsRequest, dto: CreateDogDto) {
    return this.dogsService.create(request.user.id, dto);
  }

  enrollEmbedding(
    request: AuthenticatedDogsRequest,
    id: string,
    dto: EmbeddingDto,
  ) {
    return this.dogsService.enrollEmbedding(
      request.user.id,
      id,
      dto.embedding,
    );
  }

  findAll(request: AuthenticatedDogsRequest) {
    return this.dogsService.findAll(request.user.id);
  }

  update(
    request: AuthenticatedDogsRequest,
    id: string,
    dto: UpdateDogDto,
  ) {
    return this.dogsService.update(request.user.id, id, dto);
  }

  remove(request: AuthenticatedDogsRequest, id: string) {
    return this.dogsService.remove(request.user.id, id);
  }
}

Controller("dogs")(DogsController);
UseGuards(SupabaseAuthGuard)(DogsController);
Get()(DogsController.prototype, "findAll", getMethodDescriptor("findAll"));
Post()(DogsController.prototype, "create", getMethodDescriptor("create"));
Post(":id/embedding")(
  DogsController.prototype,
  "enrollEmbedding",
  getMethodDescriptor("enrollEmbedding"),
);
HttpCode(HttpStatus.OK)(
  DogsController.prototype,
  "enrollEmbedding",
  getMethodDescriptor("enrollEmbedding"),
);
Patch(":id")(DogsController.prototype, "update", getMethodDescriptor("update"));
Delete(":id")(
  DogsController.prototype,
  "remove",
  getMethodDescriptor("remove"),
);
Request()(DogsController.prototype, "create", 0);
Body()(DogsController.prototype, "create", 1);
setParameterTypes("create", [Object, CreateDogDto]);
Request()(DogsController.prototype, "enrollEmbedding", 0);
Param("id")(DogsController.prototype, "enrollEmbedding", 1);
Body()(DogsController.prototype, "enrollEmbedding", 2);
setParameterTypes("enrollEmbedding", [Object, String, EmbeddingDto]);
Request()(DogsController.prototype, "findAll", 0);
setParameterTypes("findAll", [Object]);
Request()(DogsController.prototype, "update", 0);
Param("id")(DogsController.prototype, "update", 1);
Body()(DogsController.prototype, "update", 2);
setParameterTypes("update", [Object, String, UpdateDogDto]);
Request()(DogsController.prototype, "remove", 0);
Param("id")(DogsController.prototype, "remove", 1);
setParameterTypes("remove", [Object, String]);
Inject(DogsService)(DogsController, undefined, 0);
