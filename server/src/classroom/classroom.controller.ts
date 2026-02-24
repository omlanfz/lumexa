import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassroomService } from './classroom.service';
import { StripeService } from '../payments/stripe.service';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('join')
  @UseGuards(AuthGuard('jwt'))
  joinLab(@Request() req, @Body() body: { bookingId: string }) {
    return this.classroomService.joinLab(req.user.userId, body.bookingId);
  }

  /**
   * LiveKit webhook — receives events like egress_ended (recording complete).
   * This endpoint is NOT authenticated with JWT — it uses LiveKit's own
   * Authorization header signature verification instead.
   *
   * Must be added to your LiveKit webhook configuration in the LiveKit console.
   */
  @Post('webhook/livekit')
  @HttpCode(HttpStatus.OK) // Always return 200 to LiveKit even on soft errors
  handleLiveKitWebhook(
    @Body() body: any,
    @Headers('Authorization') authHeader: string,
  ) {
    return this.classroomService.handleLiveKitWebhook(
      body,
      authHeader,
      this.stripeService,
    );
  }
}
