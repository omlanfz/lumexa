import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('classroom')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('join')
  joinLab(@Request() req, @Body() body: { bookingId: string }) {
    return this.classroomService.joinLab(req.user.userId, body.bookingId);
  }
}
