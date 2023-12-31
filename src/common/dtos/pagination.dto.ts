import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {

    @IsOptional()
    @IsPositive()
    @Type(() => Number) // equivalente al enableImplicitConversions
    limit?: number;

    @IsOptional()
    @Min(0)
    @Type(() => Number) // equivalente al enableImplicitConversions
    offset?: number;

}