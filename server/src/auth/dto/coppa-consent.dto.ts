import { IsBoolean } from 'class-validator';

export class CoppaConsentDto {
  @IsBoolean({ message: 'consentGiven must be a boolean value.' })
  consentGiven: boolean;
}
