import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class CreateRatingDto {
  tripId: string;
  toUserId: string;
  score: number;
  comment?: string;
}

@ApiTags('Ratings')
@ApiBearerAuth()
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear calificación para un viaje finalizado' })
  create(
    @CurrentUser('id') fromUserId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.create(fromUserId, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener calificaciones recibidas por un usuario' })
  getByUser(@Param('userId') userId: string) {
    return this.ratingsService.getByUser(userId);
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Obtener calificaciones de un viaje' })
  getByTrip(@Param('tripId') tripId: string) {
    return this.ratingsService.getByTrip(tripId);
  }

  @Get('trip/:tripId/has-rated')
  @ApiOperation({ summary: 'Verificar si el usuario actual ya calificó un viaje' })
  hasRated(
    @Param('tripId') tripId: string,
    @CurrentUser('id') fromUserId: string,
  ) {
    return this.ratingsService.hasRated(tripId, fromUserId).then((rated) => ({ rated }));
  }
}
