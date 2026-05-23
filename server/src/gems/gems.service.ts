import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PurchaseGemsDto } from './dto/purchase-gems.dto';

@Injectable()
export class GemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  async initiatePurchase(userId: string, dto: PurchaseGemsDto) {
    const wallet = await this.getOrCreateWallet(userId);

    const purchase = await this.prisma.gemPurchase.create({
      data: {
        walletId: wallet.id,
        gems: dto.gems,
        amountCents: dto.amountCents,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        status: 'PENDING',
        externalRef: dto.externalRef,
        proofUrl: dto.proofUrl,
      },
    });

    return { purchaseId: purchase.id };
  }

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

  async completeStripePurchase(stripePaymentIntentId: string) {
    const purchase = await this.prisma.gemPurchase.findFirst({
      where: { externalRef: stripePaymentIntentId, status: 'PENDING' },
    });
    if (!purchase) return;

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

  async spend(userId: string, gems: number) {
    const wallet = await this.prisma.gemWallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Gem wallet not found');
    if (wallet.balance < gems)
      throw new BadRequestException('Insufficient gem balance');

    return this.prisma.gemWallet.update({
      where: { userId },
      data: { balance: { decrement: gems } },
    });
  }

  // ─── Student: request a top-up from billing contact ───────────────────────

  async requestTopup(studentUserId: string, gems: number) {
    if (gems < 1 || gems > 10000) {
      throw new BadRequestException('Gems must be between 1 and 10,000.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        fullName: true,
        email: true,
        billingContactEmail: true,
        role: true,
      },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }
    if (!user.billingContactEmail) {
      throw new BadRequestException(
        'No billing contact on file. Please contact support to add one.',
      );
    }

    this.notifications
      .sendGemTopupRequest(user.billingContactEmail, {
        studentName: user.fullName,
        gems,
        studentEmail: user.email,
      })
      .catch(() => {});

    return {
      message: `Top-up request sent to your billing contact.`,
    };
  }

  private async getOrCreateWallet(userId: string) {
    return this.prisma.gemWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}
