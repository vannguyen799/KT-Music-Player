import { Module } from 'truxie'
import { CORE_MODULE_OPTIONS, type CoreModuleConfig } from './core.config'
import { UserRepository } from './domain/user/user.repository'
import { UserService } from './domain/user/user.service'
import { AuthService } from './services/auth.service'
import { LoginUseCase } from './use-cases/login.use-case'
import { RegisterUseCase } from './use-cases/register.use-case'
import { AuthController } from './controllers/auth.controller'
import { UserController } from './controllers/user.controller'

export { CORE_MODULE_OPTIONS }
export type { CoreModuleConfig }

const repositories = [UserRepository]
const services = [UserService, AuthService]
const useCases = [LoginUseCase, RegisterUseCase]

@Module({})
export class CoreModule {
  static forRoot(config: CoreModuleConfig) {
    return {
      module: CoreModule,
      controllers: [AuthController, UserController],
      providers: [
        { provide: CORE_MODULE_OPTIONS, useValue: config },
        ...repositories,
        ...services,
        ...useCases,
      ],
      exports: [...services],
    }
  }
}
