// FILE PATH: server/src/code-runner/code-runner.controller.ts

import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CodeRunnerService, type LanguagesResponse, type RunResponse } from './code-runner.service';
import { RUNNER_LIMITS, type RunnerLanguage } from './code-runner.config';

export class RunCodeDto {
  @IsIn(['c', 'cpp', 'java'])
  language: RunnerLanguage;

  @IsString()
  @MaxLength(RUNNER_LIMITS.maxCodeChars)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(RUNNER_LIMITS.maxStdinChars)
  stdin?: string;
}

/** Any signed-in user (a student in a lesson, a teacher preparing one) may run code; the rate limit keeps it fair. */
@Controller('code-runner')
@UseGuards(AuthGuard('jwt'))
export class CodeRunnerController {
  constructor(private readonly runner: CodeRunnerService) {}

  /** Which compiled languages this server can run right now (the Code Lab shows a Run button only for those). */
  @Get('languages')
  @Header('Cache-Control', 'private, max-age=60')
  languages(): Promise<LanguagesResponse> {
    return this.runner.languages();
  }

  @Post('run')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  run(@Body() dto: RunCodeDto): Promise<RunResponse> {
    return this.runner.run({ language: dto.language, code: dto.code, stdin: dto.stdin });
  }
}
