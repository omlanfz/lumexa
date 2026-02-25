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

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(500)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grades?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  qualification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Controller('teachers')
@UseGuards(AuthGuard('jwt'))
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  // ── TEACHER-ONLY endpoints ─────────────────────────────────────────────────

  /**
   * GET /teachers/me/profile
   * Returns the teacher's own profile (bio, rate, rating, strikes, etc.)
   * Used by the Profile/Settings page.
   */
  @Get('me/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyProfile(@Request() req) {
    return this.teachersService.getMyProfile(req.user.userId);
  }

  /**
   * PATCH /teachers/me/profile
   * Update bio, hourlyRate, and extended profile fields.
   * Body: UpdateProfileDto
   */
  @Patch('me/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.teachersService.updateMyProfile(req.user.userId, dto);
  }

  /**
   * GET /teachers/me/stats
   * Aggregated dashboard stats: rating, earnings, completed classes, etc.
   * Used by the teacher dashboard header cards.
   */
  @Get('me/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyStats(@Request() req) {
    return this.teachersService.getMyStats(req.user.userId);
  }

  /**
   * GET /teachers/me/next-class
   * Returns the nearest upcoming booked shift with student info and countdown.
   * Used by the countdown timer on the teacher dashboard.
   * Returns null if no upcoming class exists.
   */
  @Get('me/next-class')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getNextClass(@Request() req) {
    return this.teachersService.getNextClass(req.user.userId);
  }

  /**
   * GET /teachers/me/earnings?page=1&limit=20
   * Paginated list of completed bookings with earnings per class + totals.
   * Used by the Earnings/Payouts page.
   */
  @Get('me/earnings')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyEarnings(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.teachersService.getMyEarnings(req.user.userId, +page, +limit);
  }

  /**
   * GET /teachers/me/students
   * Aggregated student roster: all students this teacher has taught or has
   * upcoming sessions with. Includes stats (completed, pending, last/next date).
   * Used by the My Students page.
   */
  @Get('me/students')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyStudents(@Request() req) {
    return this.teachersService.getMyStudents(req.user.userId);
  }

  /**
   * GET /teachers/me/students/:studentId/snapshot
   * Returns a read-only view of a student's learning history with this teacher.
   * Used by the "Login as Student" / teacher view-as-student feature.
   * Only accessible if the teacher has at least one booking with this student.
   */
  @Get('me/students/:studentId/snapshot')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getStudentSnapshot(@Request() req, @Param('studentId') studentId: string) {
    return this.teachersService.getStudentSnapshot(req.user.userId, studentId);
  }

  /**
   * GET /teachers/me/rank
   * Returns the teacher's current gamification rank, points, progress to next tier.
   * Used by the dashboard rank card.
   */
  @Get('me/rank')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getMyRank(@Request() req) {
    return this.teachersService.getMyRank(req.user.userId);
  }

  // ── PUBLIC endpoints — any authenticated user ──────────────────────────────

  /**
   * GET /teachers/leaderboard?limit=20
   * Public leaderboard of teachers ranked by points.
   * Used by the leaderboard page.
   */
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit = '20') {
    return this.teachersService.getLeaderboard(+limit);
  }

  /**
   * GET /teachers/:teacherId/profile
   * Public teacher profile used by the marketplace detail view.
   * Returns bio, rating, available slots, and recent reviews.
   */
  @Get(':teacherId/profile')
  getPublicProfile(@Param('teacherId') teacherId: string) {
    return this.teachersService.getPublicProfile(teacherId);
  }
}
