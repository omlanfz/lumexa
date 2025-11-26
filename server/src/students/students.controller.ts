import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @UseGuards(AuthGuard('jwt')) // <--- Protects this route (Token Required)
  @Post()
  create(@Request() req, @Body() body: { name: string; age: number }) {
    // req.user.userId comes from the JwtStrategy
    return this.studentsService.create(req.user.userId, body.name, body.age);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.studentsService.findAll(req.user.userId);
  }
}
