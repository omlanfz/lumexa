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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';

@Controller('students')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PARENT) // Only parents can manage students
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(req.user.userId, dto.name, dto.age);
  }

  @Get()
  findAll(@Request() req) {
    return this.studentsService.findAll(req.user.userId);
  }
}
