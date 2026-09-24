import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants.js";
import { CreateDogDto, UpdateDogDto } from "./dogs.dto.js";

export interface DogsService {
  readonly supabase: SupabaseClient;
}

export class DogsService {
  constructor(supabase: SupabaseClient) {
    Object.assign(this, { supabase });
  }

  async create(ownerId: string, dto: CreateDogDto) {
    const { data, error } = await this.supabase
      .from("dogs")
      .insert({ ...dto, owner_id: ownerId })
      .select()
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async findAll(ownerId: string) {
    const { data, error } = await this.supabase
      .from("dogs")
      .select()
      .eq("owner_id", ownerId);

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async update(ownerId: string, id: string, dto: UpdateDogDto) {
    const { data, error } = await this.supabase
      .from("dogs")
      .update(dto)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select()
      .single();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    if (data === null) {
      throw new NotFoundException("Dog not found.");
    }

    return data;
  }

  async remove(ownerId: string, id: string) {
    const { data, error } = await this.supabase
      .from("dogs")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select();

    if (error !== null) {
      throw new InternalServerErrorException(error.message);
    }

    if (data === null || data.length === 0) {
      throw new NotFoundException("Dog not found.");
    }

    return { message: "Dog deleted." };
  }
}

Injectable()(DogsService);
Inject(SUPABASE_CLIENT)(DogsService, undefined, 0);
