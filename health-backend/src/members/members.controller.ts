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
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('회원')
@ApiBearerAuth('access-token')
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({
    summary: '회원 목록 조회',
    description: '의사(DOCT): 전체 목록 | 환자(PATI): 본인만',
  })
  @ApiQuery({ name: 'member_id', required: false, description: 'ID 부분 검색' })
  @ApiQuery({ name: 'member_type', required: false, enum: ['PATI', 'DOCT'] })
  @ApiQuery({ name: 'search', required: false, description: '이름/ID 통합 검색' })
  @ApiResponse({ status: 200, description: '회원 목록' })
  findAll(
    @Request() req: any,
    @Query('member_id') member_id?: string,
    @Query('member_type') member_type?: string,
    @Query('search') search?: string,
  ) {
    return this.membersService.findAll(req.user, { member_id, member_type, search });
  }

  @Get(':memberId/health/latest')
  @ApiOperation({
    summary: '최근 건강 데이터 조회 (실시간 화면 초기 로딩)',
    description: 'DB에서 각 지표별 최근 N건을 조회합니다. 이후 WebSocket으로 실시간 수신을 연결하세요.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'limit', required: false, description: '각 지표별 최근 N건 (기본 100)' })
  @ApiResponse({ status: 200, description: '심박/혈압/혈당/걸음수/체중 최근 이력' })
  findLatestHealth(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.membersService.findLatestHealth(req.user, memberId, limitNum);
  }

  @Get(':memberId/health')
  @ApiOperation({
    summary: '건강 데이터 기간 조회',
    description: '지정 기간(from~to) 내 모든 건강 지표 데이터를 조회합니다.',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiQuery({ name: 'from', description: '시작일시 (KST ISO 8601)', example: '2026-07-10T00:00:00+09:00' })
  @ApiQuery({ name: 'to', description: '종료일시 (KST ISO 8601)', example: '2026-07-16T23:59:59+09:00' })
  @ApiResponse({ status: 200, description: '기간 내 건강 데이터' })
  findHealthByRange(
    @Request() req: any,
    @Param('memberId') memberId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.membersService.findHealthByRange(req.user, memberId, from, to);
  }

  @Get(':memberId')
  @ApiOperation({
    summary: '회원 상세 조회',
    description: '회원 기본 정보 + 질병 목록 반환',
  })
  @ApiParam({ name: 'memberId', description: '회원 ID' })
  @ApiResponse({ status: 200, description: '회원 상세 정보' })
  @ApiResponse({ status: 403, description: '환자가 타인 조회 시도' })
  findOne(@Request() req: any, @Param('memberId') memberId: string) {
    return this.membersService.findOne(req.user, memberId);
  }
}
