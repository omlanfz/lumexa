// FILE PATH: server/src/certificates/dto/certificate.dto.ts
//
// Request bodies of the admin certificate endpoints. Names and dates are
// validated more strictly in CertificatesService (what the fonts can print, real
// calendar dates, not in the future); these only shape the request.

import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** What the admin confirms before a certificate comes into existence: the exact
 * name to print, the programme name and the completion date. */
export class ApproveCertificateDto {
  @IsString() @IsNotEmpty() @MaxLength(200) recipientName: string;
  @IsString() @IsNotEmpty() @MaxLength(300) programName: string;
  @IsString()
  @Matches(DATE_PATTERN, { message: 'completionDate must be YYYY-MM-DD' })
  completionDate: string;
  /** The optional "With Distinction" line of the design. */
  @IsOptional() @IsBoolean() withDistinction?: boolean;
}

export class DismissReviewDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

/** A correction: any of the printed details, and why. */
export class ReplaceCertificateDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
  @IsOptional() @IsString() @MaxLength(200) recipientName?: string;
  @IsOptional() @IsString() @MaxLength(300) programName?: string;
  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN, { message: 'completionDate must be YYYY-MM-DD' })
  completionDate?: string;
  @IsOptional() @IsBoolean() withDistinction?: boolean;
  /** Email the corrected certificate to the student (default true). */
  @IsOptional() @IsBoolean() sendEmail?: boolean;
}

export class RevokeCertificateDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

export class ResendCertificateEmailDto {
  /** Needed to send again after the certificate was already emailed. */
  @IsOptional() @IsBoolean() force?: boolean;
}

/** A sample of the finished design for the admin to look at (nothing is issued).
 * Every field but the theme is optional: leave one out and a sample value is used. */
export class TemplatePreviewDto {
  /** The key of one of the themes (GET /admin/certificates/themes). */
  @IsString() @IsNotEmpty() @MaxLength(60) theme: string;
  @IsOptional() @IsString() @MaxLength(200) recipientName?: string;
  @IsOptional() @IsString() @MaxLength(300) programName?: string;
  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN, { message: 'completionDate must be YYYY-MM-DD' })
  completionDate?: string;
  @IsOptional() @IsBoolean() withDistinction?: boolean;
  /** png (default) to look at, pdf to open as it prints. */
  @IsOptional() @IsIn(['png', 'pdf']) format?: 'png' | 'pdf';
}
