import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('me')
  listMine(@Request() req: any) {
    return this.certificates.listForStudent(req.user.userId);
  }
}
