import { Inject, Controller, Get, Post, RouteGuards, NoGuard, Body } from 'truxie'
import { Auth, AuthGuard, type AuthPayload } from '$backend/guards/auth.guard'
import { LoginUseCase } from '../use-cases/login.use-case'
import { RegisterUseCase } from '../use-cases/register.use-case'
import { UserService } from '../domain/user'
import { sendSuccess } from '$backend/shared/response'

@Inject(LoginUseCase, RegisterUseCase, UserService)
@Controller('auth')
@RouteGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly userService: UserService,
  ) {}

  @Post('/login')
  @NoGuard()
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.loginUseCase.execute(body)
    return sendSuccess(result, 'Login successful')
  }

  @Post('/register')
  @NoGuard()
  async register(@Body() body: { username: string; password: string }) {
    const result = await this.registerUseCase.execute(body)
    return sendSuccess(result, 'Registration successful')
  }

  @Get('/me')
  async getMe(@Auth() auth: AuthPayload) {
    const user = await this.userService.findById(auth.id)
    return sendSuccess({ user: this.userService.toPublic(user) })
  }
}
