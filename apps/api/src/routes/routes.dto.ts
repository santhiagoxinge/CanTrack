import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class RouteStopDto {
  dogId!: string;
  pickupTime!: string;
}

export class CreateRouteDto {
  stops!: RouteStopDto[];
}

export class ReorderRouteStopsDto {
  order!: number[];
}

export class RouteEdgeDto {
  from!: string;
  to!: string;
  weight!: number;
}

export class RoutePathDto {
  edges!: RouteEdgeDto[];
  start!: string;
  end!: string;
}

IsString()(RouteStopDto.prototype, "dogId");
IsNotEmpty()(RouteStopDto.prototype, "dogId");
IsString()(RouteStopDto.prototype, "pickupTime");
IsNotEmpty()(RouteStopDto.prototype, "pickupTime");
IsArray()(CreateRouteDto.prototype, "stops");
ArrayNotEmpty()(CreateRouteDto.prototype, "stops");
ValidateNested({ each: true })(CreateRouteDto.prototype, "stops");
Type(() => RouteStopDto)(CreateRouteDto.prototype, "stops");
IsArray()(ReorderRouteStopsDto.prototype, "order");
ArrayNotEmpty()(ReorderRouteStopsDto.prototype, "order");
IsInt({ each: true })(ReorderRouteStopsDto.prototype, "order");
Min(0, { each: true })(ReorderRouteStopsDto.prototype, "order");
IsString()(RouteEdgeDto.prototype, "from");
IsNotEmpty()(RouteEdgeDto.prototype, "from");
IsString()(RouteEdgeDto.prototype, "to");
IsNotEmpty()(RouteEdgeDto.prototype, "to");
IsNumber({ allowNaN: false, allowInfinity: false })(RouteEdgeDto.prototype, "weight");
Min(0)(RouteEdgeDto.prototype, "weight");
IsArray()(RoutePathDto.prototype, "edges");
ValidateNested({ each: true })(RoutePathDto.prototype, "edges");
Type(() => RouteEdgeDto)(RoutePathDto.prototype, "edges");
IsString()(RoutePathDto.prototype, "start");
IsNotEmpty()(RoutePathDto.prototype, "start");
IsString()(RoutePathDto.prototype, "end");
IsNotEmpty()(RoutePathDto.prototype, "end");
