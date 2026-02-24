import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  private readonly PLATFORM_FEE_PERCENT = 0.25;

  onModuleInit() {
    if (!process.env.STRIPE_SECRET_KEY) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set. Payment features will be disabled.',
      );
      return;
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // stripe v20 requires this exact version string
      apiVersion: '2026-01-28.clover',
    });
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new Error(
        'Stripe is not configured. Set the STRIPE_SECRET_KEY environment variable.',
      );
    }
    return this.stripe;
  }

  async createPaymentIntent(
    amountCents: number,
    teacherStripeAccountId: string,
    bookingId: string,
  ): Promise<Stripe.PaymentIntent> {
    const stripe = this.ensureStripe();
    const applicationFee = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);

    return stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',
      application_fee_amount: applicationFee,
      transfer_data: { destination: teacherStripeAccountId },
      metadata: { bookingId },
    });
  }

  async capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.ensureStripe();
    return stripe.paymentIntents.capture(paymentIntentId);
  }

  async cancelPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.ensureStripe();
    return stripe.paymentIntents.cancel(paymentIntentId);
  }

  async refundPartial(
    paymentIntentId: string,
    refundAmountCents: number,
  ): Promise<Stripe.Refund> {
    const stripe = this.ensureStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : (intent.latest_charge as Stripe.Charge)?.id;

    if (!chargeId) throw new Error('No charge found on this PaymentIntent.');

    return stripe.refunds.create({
      charge: chargeId,
      amount: refundAmountCents,
    });
  }

  async createConnectOnboardingLink(teacherId: string): Promise<{
    url: string;
    accountId: string;
  }> {
    const stripe = this.ensureStripe();

    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { teacherId },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/teacher-dashboard?stripe=refresh`,
      return_url: `${process.env.FRONTEND_URL}/teacher-dashboard?stripe=success`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url, accountId: account.id };
  }

  async isAccountOnboarded(stripeAccountId: string): Promise<boolean> {
    const stripe = this.ensureStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return (
      !!account.details_submitted &&
      !(account.requirements?.currently_due?.length ?? 0)
    );
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = this.ensureStripe();
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }
}
