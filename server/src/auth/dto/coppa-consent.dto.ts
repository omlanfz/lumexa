import { IsBoolean, IsTrue } from 'class-validator';

export class CoppaConsentDto {
  @IsBoolean()
  @IsTrue({ message: 'You must accept the parental consent agreement.' })
  consentGiven: boolean;
}
