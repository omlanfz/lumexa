// FILE PATH: server/src/teachers/teachers.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeachersService } from './teachers.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(500)
  hourlyRate?: number;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) subjects?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) grades?: string[];
  @IsOptional() @IsString() @MaxLength(100) experience?: string;
  @IsOptional() @IsString() @MaxLength(100) qualification?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('teachers')
@UseGuards(AuthGuard('jwt'))
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  // ── TEACHER-ONLY ──────────────────────────────────────────────────────────

  /** GET /teachers/me/profile — own profile with full stats */
  @Get('me/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyProfile(@Request() req: any) {
    return this.teachersService.getMyProfile(req.user.userId);
  }

  /** PATCH /teachers/me/profile — update bio, rate, and extended fields */
  @Patch('me/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  updateMyProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.teachersService.updateMyProfile(req.user.userId, dto);
  }

  /** GET /teachers/me/stats — aggregated dashboard stats */
  @Get('me/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyStats(@Request() req: any) {
    return this.teachersService.getMyStats(req.user.userId);
  }

  /** GET /teachers/me/next-class — nearest upcoming booking with countdown */
  @Get('me/next-class')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getNextClass(@Request() req: any) {
    return this.teachersService.getNextClass(req.user.userId);
  }

  /** GET /teachers/me/earnings?page=1&limit=20 — paginated earnings history */
  @Get('me/earnings')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyEarnings(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.teachersService.getMyEarnings(req.user.userId, +page, +limit);
  }

  /** GET /teachers/me/students — aggregated student roster */
  @Get('me/students')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyStudents(@Request() req: any) {
    return this.teachersService.getMyStudents(req.user.userId);
  }

  /**
   * GET /teachers/me/students/:studentId/snapshot
   * Read-only view of a student's history with this teacher.
   * Used by the "View as Student" feature.
   * Only works if teacher has at least one booking with this student.
   */
  @Get('me/students/:studentId/snapshot')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getStudentSnapshot(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    return this.teachersService.getStudentSnapshot(req.user.userId, studentId);
  }

  /** GET /teachers/me/rank — gamification rank info */
  @Get('me/rank')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyRank(@Request() req: any) {
    return this.teachersService.getMyRank(req.user.userId);
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────────

  /** GET /teachers/leaderboard?limit=20 — top teachers by points */
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit = '20') {
    return this.teachersService.getLeaderboard(+limit);
  }

  /**
   * GET /teachers/:teacherId/profile
   * Public profile for marketplace detail view.
   * Must be last to avoid matching me/* routes.
   */
  @Get(':teacherId/profile')
  getPublicProfile(@Param('teacherId') teacherId: string) {
    return this.teachersService.getPublicProfile(teacherId);
  }
}
