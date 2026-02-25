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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('students')
@UseGuards(AuthGuard('jwt'))
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ─── Create student ────────────────────────────────────────────────────────
  // POST /students
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  create(@Request() req: any, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(req.user.userId, dto);
  }

  // ─── List parent's students ────────────────────────────────────────────────
  // GET /students
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  findAll(@Request() req: any) {
    return this.studentsService.findAllForParent(req.user.userId);
  }

  // ─── Leaderboard — MUST come before :studentId to avoid route collision ───
  // GET /students/leaderboard?studentId=xxx
  @Get('leaderboard')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getLeaderboard(@Query('studentId') studentId?: string) {
    return this.studentsService.getLeaderboard(studentId);
  }

  // ─── Student dashboard hub ─────────────────────────────────────────────────
  // GET /students/:studentId/dashboard
  @Get(':studentId/dashboard')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getStudentDashboard(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getStudentDashboard(studentId, req.user.userId);
  }

  // ─── Student bookings (lesson history) ────────────────────────────────────
  // GET /students/:studentId/bookings?page=1&limit=20&filter=upcoming|completed|all
  @Get(':studentId/bookings')
  @UseGuards(RolesGuard)
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
