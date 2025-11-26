import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // We deleted the auto-generated code here because
  // we are handling User Creation inside the Auth Module.
}
