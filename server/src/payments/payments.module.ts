import { Module, Global } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Global() // Makes StripeService available everywhere without re-importing
@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
