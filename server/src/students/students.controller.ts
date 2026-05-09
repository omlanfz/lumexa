import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { IsEmail, IsString, MinLength } from 'class-validator';

// ─── Inline DTO ──────────────────────────────────────────────────────────────

class StudentLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC ROUTES (no JWT)
  // ══════════════════════════════════════════════════════════════════════════

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.studentsService.registerStudent(dto);
  }

  @Post('login')
  login(@Body() dto: StudentLoginDto) {
    return this.studentsService.loginStudent(dto.email, dto.password);
  }

  @Post('consent/confirm/:token')
  confirmConsent(@Param('token') token: string) {
    return this.studentsService.confirmConsent(token);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STUDENT SELF-AUTH ROUTES (STUDENT role JWT)
  // Named sub-routes (me/lessons, me/progress, etc.) BEFORE parameterised
  // ══════════════════════════════════════════════════════════════════════════

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMe(@Request() req: any) {
    return this.studentsService.getMyProfile(req.user.userId);
  }

  @Get('me/dashboard')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMyDashboard(@Request() req: any) {
    return this.studentsService.getMyDashboard(req.user.userId);
  }

  @Get('me/lessons')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMyLessons(
    @Request() req: any,
    @Query('status') status: 'upcoming' | 'completed' | 'all' = 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.studentsService.getMyLessons(
      req.user.userId,
      status,
      +page,
      +limit,
    );
  }

  @Get('me/progress')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMyProgress(@Request() req: any) {
    return this.studentsService.getMyProgress(req.user.userId);
  }

  @Get('me/teachers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMyTeachers(@Request() req: any) {
    return this.studentsService.getMyTeachers(req.user.userId);
  }

  @Get('me/rankings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT)
  getMyRankings(@Request() req: any) {
    return this.studentsService.getMyRankings(req.user.userId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARENT-PROXY ROUTES (legacy PARENT role JWT)
  // ══════════════════════════════════════════════════════════════════════════

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  create(@Request() req: any, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  findAll(@Request() req: any) {
    return this.studentsService.findAllForParent(req.user.userId);
  }

  // GET leaderboard — MUST be before :studentId
  @Get('leaderboard')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  getLeaderboard(@Query('studentId') studentId?: string) {
    return this.studentsService.getLeaderboard(studentId);
  }

  @Get(':studentId/dashboard')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  getStudentDashboard(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getStudentDashboard(studentId, req.user.userId);
  }

  @Get(':studentId/bookings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  getStudentBookings(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('filter') filter: 'all' | 'upcoming' | 'completed' = 'all',
  ) {
    return this.studentsService.getStudentBookings(
      studentId,
      req.user.userId,
      +page,
      +limit,
      filter,
    );
  }
}
