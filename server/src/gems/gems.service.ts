import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseGemsDto } from './dto/purchase-gems.dto';

@Injectable()
export class GemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get or create the wallet for a user */
  async getWallet(userId: string) {
    let wallet = await this.prisma.gemWallet.findUnique({
      where: { userId },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!wallet) {
      wallet = await this.prisma.gemWallet.create({
        data: { userId },
        include: { purchases: true },
      });
    }
    return wallet;
  }

  /**
   * Create a pending gem purchase.
   * For STRIPE: a separate webhook completes it.
   * For BKASH/BANK_TRANSFER: admin manually approves via /gems/purchases/:id/approve.
   */
  async initiatePurchase(userId: string, dto: PurchaseGemsDto) {
    const wallet = await this.getOrCreateWallet(userId);

    const purchase = await this.prisma.gemPurchase.create({
      data: {
        walletId: wallet.id,
        gems: dto.gems,
        amountCents: dto.amountCents,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        status: dto.paymentMethod === 'BANK_TRANSFER' ? 'PENDING' : 'PENDING',
        externalRef: dto.externalRef,
        proofUrl: dto.proofUrl,
      },
    });

    return { purchaseId: purchase.id };
  }

  /**
   * Approve a pending purchase (admin action for BANK_TRANSFER / BKASH).
   * Atomically adds gems to wallet balance.
   */
  async approvePurchase(purchaseId: string) {
    const purchase = await this.prisma.gemPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status !== 'PENDING') {
      throw new BadRequestException('Purchase is not in PENDING state');
    }

    const [updatedPurchase] = await this.prisma.$transaction([
      this.prisma.gemPurchase.update({
        where: { id: purchaseId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.gemWallet.update({
        where: { id: purchase.walletId },
        data: { balance: { increment: purchase.gems } },
      }),
    ]);

    return updatedPurchase;
  }

  /**
   * Complete a Stripe purchase after webhook confirms payment.
   * Called internally from the payments/webhook handler.
   */
  async completeStripePurchase(stripePaymentIntentId: string) {
    const purchase = await this.prisma.gemPurchase.findFirst({
      where: { externalRef: stripePaymentIntentId, status: 'PENDING' },
    });
    if (!purchase) return; // idempotent

    await this.prisma.$transaction([
      this.prisma.gemPurchase.update({
        where: { id: purchase.id },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.gemWallet.update({
        where: { id: purchase.walletId },
        data: { balance: { increment: purchase.gems } },
      }),
    ]);
  }

  /** Deduct gems from wallet (called when booking a lesson) */
  async spend(userId: string, gems: number) {
    const wallet = await this.prisma.gemWallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Gem wallet not found');
    if (wallet.balance < gems) throw new BadRequestException('Insufficient gem balance');

    return this.prisma.gemWallet.update({
      where: { userId },
      data: { balance: { decrement: gems } },
    });
  }

  private async getOrCreateWallet(userId: string) {
    return this.prisma.gemWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}
