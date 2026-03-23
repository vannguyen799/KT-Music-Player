import { Injectable, Inject } from 'truxie'
import { signToken, type AuthPayload } from '$backend/shared/auth'
import { CORE_MODULE_OPTIONS, type CoreModuleConfig } from '../core.config'

@Injectable()
@Inject(CORE_MODULE_OPTIONS)
export class AuthService {
  constructor(private readonly config: CoreModuleConfig) {}

  generateToken(payload: AuthPayload): string {
    return signToken(payload, '365d')
  }
}
