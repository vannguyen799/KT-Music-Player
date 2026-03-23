import { Injectable, Inject, type IUseCase, ValidationError } from 'truxie'
import { UserService, type PublicUser } from '../domain/user'
import { AuthService } from '../services/auth.service'

export interface RegisterInput {
  username: string
  password: string
}

export interface RegisterResult {
  token: string
  user: PublicUser
}

@Injectable()
@Inject(UserService, AuthService)
export class RegisterUseCase implements IUseCase<RegisterInput, RegisterResult> {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    if (!input.username || !input.password) {
      throw new ValidationError('Username and password are required')
    }

    const user = await this.userService.create({
      username: input.username,
      password: input.password,
    })

    const token = this.authService.generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    return {
      token,
      user: this.userService.toPublic(user),
    }
  }
}
