import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsIn,
} from 'class-validator';

export type PaymentMethod = 'STRIPE' | 'BKASH' | 'BANK_TRANSFER';
export type Currency = 'USD' | 'BDT';

export class PurchaseGemsDto {
  @IsInt()
  @Min(1)
  gems: number;

  @IsInt()
  @Min(1)
  amountCents: number;

  @IsString()
  @IsIn(['USD', 'BDT'])
  currency: Currency;

  @IsString()
  @IsIn(['STRIPE', 'BKASH', 'BANK_TRANSFER'])
  paymentMethod: PaymentMethod;

  /** Stripe: clientSecret returned from create-intent. bKash: trxID. Bank: any ref. */
  @IsOptional()
  @IsString()
  externalRef?: string;

  /** Bank transfer: URL of uploaded proof image (Cloudinary URL) */
  @IsOptional()
  @IsString()
  proofUrl?: string;
}
