import {
  Controller,
  Get,
  Post,
  Body,
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

  // GET /students — returns all students for the authenticated parent
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  findAll(@Request() req: any) {
    return this.studentsService.findAllForParent(req.user.userId);
  }

  // POST /students — creates a new student under the authenticated parent
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  create(@Request() req: any, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(req.user.userId, dto);
  }
}
