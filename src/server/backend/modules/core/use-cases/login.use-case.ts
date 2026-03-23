import { Injectable, Inject, type IUseCase, ValidationError, UnauthorizedError } from 'truxie'
import { UserService, type PublicUser } from '../domain/user'
import { AuthService } from '../services/auth.service'

export interface LoginInput {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: PublicUser
}

@Injectable()
@Inject(UserService, AuthService)
export class LoginUseCase implements IUseCase<LoginInput, LoginResult> {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    if (!input.username || !input.password) {
      throw new ValidationError('Username and password are required')
    }

    const user = await this.userService.findByUsernameWithPassword(input.username)
    if (!user) throw new UnauthorizedError('Login failed')

    const valid = await this.userService.verifyPassword(input.password, user.password)
    if (!valid) throw new UnauthorizedError('Login failed')

    await this.userService.updateLastAccess(user.id)

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
