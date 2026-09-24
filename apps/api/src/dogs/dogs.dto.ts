import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateDogDto {
  name!: string;
  breed?: string;
  notes?: string;
}

export class UpdateDogDto {
  name?: string;
  breed?: string;
  notes?: string;
}

export class EmbeddingDto {
  embedding!: number[];
}

IsString()(CreateDogDto.prototype, "name");
IsNotEmpty()(CreateDogDto.prototype, "name");
IsOptional()(CreateDogDto.prototype, "breed");
IsString()(CreateDogDto.prototype, "breed");
IsOptional()(CreateDogDto.prototype, "notes");
IsString()(CreateDogDto.prototype, "notes");
IsOptional()(UpdateDogDto.prototype, "name");
IsString()(UpdateDogDto.prototype, "name");
IsNotEmpty()(UpdateDogDto.prototype, "name");
IsOptional()(UpdateDogDto.prototype, "breed");
IsString()(UpdateDogDto.prototype, "breed");
IsOptional()(UpdateDogDto.prototype, "notes");
IsString()(UpdateDogDto.prototype, "notes");
IsArray()(EmbeddingDto.prototype, "embedding");
ArrayNotEmpty()(EmbeddingDto.prototype, "embedding");
IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })(
  EmbeddingDto.prototype,
  "embedding",
);
