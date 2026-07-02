import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RatingsService, CreateRatingDto } from './ratings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiOperation({ summary: 'Calificar un viaje finalizado (con categorías)' })
  create(@CurrentUser('id') fromUserId: string, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(fromUserId, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Calificaciones recibidas por un usuario' })
  getByUser(@Param('userId') userId: string) {
    return this.ratingsService.getByUser(userId);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Calificaciones recibidas por una empresa' })
  getByCompany(@Param('companyId') companyId: string) {
    return this.ratingsService.getByCompany(companyId);
  }

  @Get('company/:companyId/average')
  @ApiOperation({ summary: 'Promedio rápido de una empresa (para listas)' })
  getCompanyAverage(@Param('companyId') companyId: string) {
    return this.ratingsService.getCompanyAverage(companyId);
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Calificaciones de un viaje' })
  getByTrip(@Param('tripId') tripId: string) {
    return this.ratingsService.getByTrip(tripId);
  }

  @Get('trip/:tripId/has-rated')
  @ApiOperation({ summary: 'Si el usuario actual ya calificó este viaje' })
  hasRated(@Param('tripId') tripId: string, @CurrentUser('id') fromUserId: string) {
    return this.ratingsService.hasRated(tripId, fromUserId).then((rated) => ({ rated }));
  }
}
