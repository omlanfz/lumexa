// FILE PATH: server/src/lumi/lumi.controller.ts
//
// ─── Lumi Chat Controller ────────────────────────────────────────────────────
//
// POST /lumi/chat — JWT required (prevents unauthenticated access)
//
// Body:
//   {
//     message: string,                              // current user message
//     history?: [{ role: "user"|"assistant", content: string }],
//     variant?: "teacher" | "student" | "parent",  // persona variant
//   }
//
// Response:
//   {
//     reply: string,
//     source: "faq" | "ollama" | "guardrail" | "fallback"
//   }

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LumiService, ChatMessage } from './lumi.service';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class HistoryMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class LumiChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  history?: ChatMessage[];

  @IsOptional()
  @IsString()
  @IsIn(['teacher', 'student', 'parent'])
  variant?: 'teacher' | 'student' | 'parent';
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('lumi')
export class LumiController {
  constructor(private readonly lumiService: LumiService) {}

  /**
   * POST /lumi/chat
   *
   * JWT auth ensures only logged-in users can access Lumi.
   * This also means the role can be derived from the JWT token.
   */
  @Post('chat')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: LumiChatDto, @Request() req: any) {
    // Derive variant from JWT role if not explicitly provided
    const roleVariantMap: Record<string, 'teacher' | 'student' | 'parent'> = {
      TEACHER: 'teacher',
      PARENT: 'parent',
      ADMIN: 'teacher',
    };

    const variant =
      dto.variant ?? roleVariantMap[req.user?.role ?? ''] ?? 'student';

    return this.lumiService.chat(dto.message, dto.history ?? [], variant);
  }
}
