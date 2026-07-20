import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HealthService } from './health.service';

@ApiTags('건강데이터')
@ApiBearerAuth('access-token')
@Controller('members')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(':memberId/health/heart-rates')
  @ApiOperation({
    summary: '심박수 조회',
    description:
      'from/to 지정 시 기간 조회(ASC), 미지정 시 최근 limit건(기본 100) DESC 반환.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-19T00:00:00+09:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-19T23:59:59+09:00' })
  @ApiQuery({ name: 'limit', required: false, description: '최근 N건 (기본 100)', example: '100' })
  @ApiResponse({ status: 200, description: '심박수 목록' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findHeartRates(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.healthService.findHeartRates(req.user, memberId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':memberId/health/blood-pressures')
  @ApiOperation({
    summary: '혈압 조회',
    description: 'from/to 지정 시 기간 조회(ASC), 미지정 시 최근 limit건(기본 100) DESC 반환.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-19T00:00:00+09:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-19T23:59:59+09:00' })
  @ApiQuery({ name: 'limit', required: false, description: '최근 N건 (기본 100)', example: '100' })
  @ApiResponse({ status: 200, description: '혈압 목록' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findBloodPressures(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.healthService.findBloodPressures(req.user, memberId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':memberId/health/glucose')
  @ApiOperation({
    summary: '혈당 조회',
    description: 'from/to 지정 시 기간 조회(ASC), 미지정 시 최근 limit건(기본 100) DESC 반환.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-19T00:00:00+09:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-19T23:59:59+09:00' })
  @ApiQuery({ name: 'limit', required: false, description: '최근 N건 (기본 100)', example: '100' })
  @ApiResponse({ status: 200, description: '혈당 목록' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findGlucose(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.healthService.findGlucose(req.user, memberId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':memberId/health/weights')
  @ApiOperation({
    summary: '체중 조회',
    description: 'from/to 지정 시 기간 조회(ASC), 미지정 시 최근 limit건(기본 100) DESC 반환.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-19T00:00:00+09:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-19T23:59:59+09:00' })
  @ApiQuery({ name: 'limit', required: false, description: '최근 N건 (기본 100)', example: '100' })
  @ApiResponse({ status: 200, description: '체중 목록' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findWeights(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.healthService.findWeights(req.user, memberId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':memberId/health/steps')
  @ApiOperation({
    summary: '걸음수 조회',
    description: 'from/to 지정 시 기간 조회(ASC), 미지정 시 최근 limit건(기본 100) DESC 반환.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-19T00:00:00+09:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-19T23:59:59+09:00' })
  @ApiQuery({ name: 'limit', required: false, description: '최근 N건 (기본 100)', example: '100' })
  @ApiResponse({ status: 200, description: '걸음수 목록' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findSteps(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.healthService.findSteps(req.user, memberId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
