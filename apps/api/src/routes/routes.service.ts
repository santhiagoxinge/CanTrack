import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AvlTree, SinglyLinkedList, WeightedGraph } from "@cantrack/structures";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants.js";
import {
  CreateRouteDto,
  ReorderRouteStopsDto,
  RoutePathDto,
} from "./routes.dto.js";

type StoredRouteStop = {
  dog_id: string;
  pickup_time: string;
};

type StoredRoute = {
  id: string;
  walker_id: string;
  stops: StoredRouteStop[];
};

type RouteStop = {
  dogId: string;
  pickupTime: string;
};

type RouteResponse = Omit<StoredRoute, "stops"> & {
  stops: RouteStop[];
};

type NextPickup = {
  routeId: string;
  dogId: string;
  pickupTime: string;
};

function toStoredStop(stop: RouteStop): StoredRouteStop {
  return {
    dog_id: stop.dogId,
    pickup_time: stop.pickupTime,
  };
}

function toPublicStop(stop: StoredRouteStop): RouteStop {
  return {
    dogId: stop.dog_id,
    pickupTime: stop.pickup_time,
  };
}

function toRouteResponse(route: StoredRoute): RouteResponse {
  return {
    ...route,
    stops: route.stops.map(toPublicStop),
  };
}

export interface RoutesService {
  readonly supabase: SupabaseClient;
}

export class RoutesService {
  constructor(supabase: SupabaseClient) {
    Object.assign(this, { supabase });
  }

  async create(walkerId: string, dto: CreateRouteDto) {
    const stops = new SinglyLinkedList<RouteStop>();
    for (const stop of dto.stops) {
      stops.append(stop);
    }

    const { data, error } = await this.supabase
      .from("routes")
      .insert({
        walker_id: walkerId,
        stops: stops.toArray().map(toStoredStop),
      })
      .select()
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }
    if (data === null) {
      throw new InternalServerErrorException("Route creation returned no data.");
    }

    return toRouteResponse(data as StoredRoute);
  }

  async findAll(walkerId: string) {
    const { data, error } = await this.supabase
      .from("routes")
      .select()
      .eq("walker_id", walkerId);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    return ((data ?? []) as StoredRoute[]).map(toRouteResponse);
  }

  private async findOwnedRoute(
    walkerId: string,
    routeId: string,
  ): Promise<RouteResponse> {
    const routes = await this.findAll(walkerId);
    const route = routes.find((candidate) => candidate.id === routeId);
    if (route === undefined) {
      throw new NotFoundException("Route not found.");
    }
    return route;
  }

  private async updateStops(
    walkerId: string,
    routeId: string,
    stops: RouteStop[],
  ) {
    const { data, error } = await this.supabase
      .from("routes")
      .update({ stops: stops.map(toStoredStop) })
      .eq("id", routeId)
      .eq("walker_id", walkerId)
      .select()
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }
    if (data === null) {
      throw new NotFoundException("Route not found.");
    }

    return toRouteResponse(data as StoredRoute);
  }

  async reorder(
    walkerId: string,
    routeId: string,
    dto: ReorderRouteStopsDto,
  ) {
    const route = await this.findOwnedRoute(walkerId, routeId);
    if (dto.order.length !== route.stops.length) {
      throw new BadRequestException("Order must contain every stop exactly once.");
    }

    const seen = new Set<number>();
    const reordered = new SinglyLinkedList<RouteStop>();
    for (const index of dto.order) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= route.stops.length ||
        seen.has(index)
      ) {
        throw new BadRequestException("Order must contain every stop exactly once.");
      }
      seen.add(index);
      reordered.append(route.stops[index]);
    }

    return this.updateStops(walkerId, routeId, reordered.toArray());
  }

  async remove(walkerId: string, routeId: string, stopIndex: string) {
    const route = await this.findOwnedRoute(walkerId, routeId);
    const index = Number(stopIndex);
    if (!Number.isInteger(index)) {
      throw new BadRequestException("Stop index is invalid.");
    }

    const stops = new SinglyLinkedList<RouteStop>();
    for (const stop of route.stops) {
      stops.append(stop);
    }
    try {
      stops.removeAt(index);
    } catch {
      throw new BadRequestException("Stop index is invalid.");
    }

    return this.updateStops(walkerId, routeId, stops.toArray());
  }

  async nextPickup(walkerId: string) {
    const routes = await this.findAll(walkerId);
    if (routes.length === 0) {
      throw new NotFoundException("No routes found.");
    }

    const tree = new AvlTree<string, NextPickup>();
    for (const route of routes) {
      for (const stop of route.stops) {
        tree.insert(stop.pickupTime, {
          routeId: route.id,
          dogId: stop.dogId,
          pickupTime: stop.pickupTime,
        });
      }
    }

    if (tree.size() === 0) {
      throw new NotFoundException("No scheduled pickups found.");
    }
    return tree.min().value;
  }

  async computePath(dto: RoutePathDto) {
    const graph = new WeightedGraph<string>();
    try {
      for (const edge of dto.edges) {
        graph.addEdge(edge.from, edge.to, edge.weight);
      }
      return graph.shortestPath(dto.start, dto.end);
    } catch {
      throw new BadRequestException("No path exists between the requested nodes.");
    }
  }
}

Injectable()(RoutesService);
Inject(SUPABASE_CLIENT)(RoutesService, undefined, 0);
