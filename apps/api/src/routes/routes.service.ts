import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AvlTree,
  SinglyLinkedList,
  Stack,
  WeightedGraph,
} from "@cantrack/structures";
import { EmbeddingDto } from "../dogs/dogs.dto.js";
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
  dogName?: string | null;
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

type CheckinRouteStop = {
  dogId?: string;
  dog_id?: string;
};

type CheckinRoute = {
  id: string;
  walker_id: string;
  stops: CheckinRouteStop[];
};

type RouteDog = {
  id: string;
  // Supabase's REST layer serializes a pgvector column as its string
  // representation ("[0.1,0.2,...]"), not a real array — supabase-js does not
  // parse it for you. Every real (non-mocked) read of this column comes back
  // as a string; parseEmbedding below normalizes both shapes.
  embedding: number[] | string | null;
};

// pgvector-over-REST comes back as a string like "[0.1,0.2,...]"; tests mock
// it as a real number[]. Handle both — this was a real bug (2026-09-24): the
// unparsed string silently produced similarity 0 for every dog (character
// arithmetic instead of number arithmetic), so "Which dog?" always showed no
// candidates in production even after Nico enrolled a dog's photos for real.
function parseEmbedding(embedding: number[] | string | null): number[] | null {
  if (embedding === null) {
    return null;
  }
  if (Array.isArray(embedding)) {
    return embedding;
  }
  try {
    const parsed = JSON.parse(embedding) as unknown;
    return Array.isArray(parsed) ? (parsed as number[]) : null;
  } catch {
    return null;
  }
}

type CheckinCandidate = {
  dogId: string;
  similarity: number;
};

type StoredCheckin = {
  id: string;
  route_id: string;
  dog_id: string;
  created_at: string;
};

const AUTO_CONFIRM_SIMILARITY = 0.8;

function getStopDogId(stop: CheckinRouteStop): string | undefined {
  return stop.dogId ?? stop.dog_id;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / Math.sqrt(leftMagnitude * rightMagnitude);
}

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

  // A route's own row only ever stores dog_id per stop, never the dog's name — this fetches
  // every referenced dog in one batch and attaches dogName to each matching stop. Nico saw
  // this gap firsthand: the walker screen showed a raw dog UUID instead of a name, because
  // this enrichment didn't exist and no test called the real endpoint end to end.
  private async enrichStopNames(routes: RouteResponse[]): Promise<RouteResponse[]> {
    const dogIds = [
      ...new Set(routes.flatMap((route) => route.stops.map((stop) => stop.dogId))),
    ];
    if (dogIds.length === 0) {
      return routes;
    }

    const { data, error } = await this.supabase
      .from("dogs")
      .select()
      .in("id", dogIds);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    const namesById = new Map(
      ((data ?? []) as { id: string; name: string }[]).map((dog) => [dog.id, dog.name]),
    );

    return routes.map((route) => ({
      ...route,
      stops: route.stops.map((stop) => ({
        ...stop,
        dogName: namesById.get(stop.dogId) ?? null,
      })),
    }));
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

    const [enriched] = await this.enrichStopNames([toRouteResponse(data as StoredRoute)]);
    return enriched;
  }

  async findAll(walkerId: string) {
    const { data, error } = await this.supabase
      .from("routes")
      .select()
      .eq("walker_id", walkerId);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    return this.enrichStopNames(((data ?? []) as StoredRoute[]).map(toRouteResponse));
  }

  async findOne(walkerId: string, routeId: string): Promise<RouteResponse> {
    return this.findOwnedRoute(walkerId, routeId);
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

  private async findOwnedCheckinRoute(
    walkerId: string,
    routeId: string,
  ): Promise<CheckinRoute> {
    const { data, error } = await this.supabase
      .from("routes")
      .select()
      .eq("id", routeId)
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }
    if (data === null || data.walker_id !== walkerId) {
      throw new NotFoundException("Route not found.");
    }

    return data as CheckinRoute;
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

  async checkIn(walkerId: string, routeId: string, dto: EmbeddingDto) {
    const route = await this.findOwnedCheckinRoute(walkerId, routeId);
    const dogIds = [
      ...new Set(
        route.stops
          .map(getStopDogId)
          .filter((dogId): dogId is string => dogId !== undefined),
      ),
    ];

    if (dogIds.length === 0) {
      return { autoConfirmed: false as const, candidates: [] };
    }

    const { data, error } = await this.supabase
      .from("dogs")
      .select()
      .in("id", dogIds);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    const candidates: CheckinCandidate[] = [];
    for (const dog of (data ?? []) as RouteDog[]) {
      const embedding = parseEmbedding(dog.embedding);
      if (embedding === null) {
        continue;
      }
      candidates.push({
        dogId: dog.id,
        similarity: cosineSimilarity(dto.embedding, embedding),
      });
    }
    candidates.sort((left, right) => right.similarity - left.similarity);

    const bestCandidate = candidates[0];
    if (
      bestCandidate !== undefined &&
      bestCandidate.similarity >= AUTO_CONFIRM_SIMILARITY
    ) {
      await this.persistCheckin(routeId, bestCandidate.dogId);
      return {
        dogId: bestCandidate.dogId,
        autoConfirmed: true as const,
      };
    }

    return { autoConfirmed: false as const, candidates };
  }

  private async persistCheckin(routeId: string, dogId: string) {
    const { data, error } = await this.supabase
      .from("checkins")
      .insert({ route_id: routeId, dog_id: dogId })
      .select()
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }
    if (data === null) {
      throw new InternalServerErrorException("Check-in creation returned no data.");
    }

    return data;
  }

  async undoCheckIn(walkerId: string, routeId: string) {
    await this.findOwnedCheckinRoute(walkerId, routeId);
    const { data, error } = await this.supabase
      .from("checkins")
      .select()
      .eq("route_id", routeId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    const stack = new Stack<StoredCheckin>();
    for (const checkin of (data ?? []) as StoredCheckin[]) {
      stack.push(checkin);
    }
    if (stack.isEmpty()) {
      throw new NotFoundException("No check-in found.");
    }

    const latest = stack.pop();
    const deletion = await this.supabase
      .from("checkins")
      .delete()
      .eq("id", latest.id);
    if (deletion.error !== null) {
      throw new InternalServerErrorException(deletion.error.message);
    }

    return { message: "Check-in undone." };
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
