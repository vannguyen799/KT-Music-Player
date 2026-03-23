import { Injectable, Inject, NotFoundError, ValidationError } from 'truxie'
import { UserRepository } from './user.repository'
import type { IUser, CreateUserInput, PublicUser } from './user.types'
import { ROLE } from './user.types'
import bcrypt from 'bcryptjs'

@Injectable()
@Inject(UserRepository)
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async findById(id: string): Promise<IUser> {
    const user = await this.repo.findById(id)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.repo.findByUsername(username)
  }

  async findByUsernameWithPassword(username: string): Promise<IUser | null> {
    return this.repo.findByUsernameWithPassword(username)
  }

  async create(input: CreateUserInput): Promise<IUser> {
    const existing = await this.repo.findByUsername(input.username)
    if (existing) throw new ValidationError('Username already taken')

    // Password hashing is handled by the Mongoose pre-save hook
    return this.repo.create({
      username: input.username,
      password: input.password,
      role: input.role ?? ROLE.USER,
      favorite: [],
      playlists: [],
    } as any)
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed)
  }

  toPublic(user: IUser): PublicUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      favorite: user.favorite || [],
      playerConfig: user.playerConfig,
    }
  }

  async updatePlayerConfig(userId: string, config: IUser['playerConfig']): Promise<IUser | null> {
    return this.repo.update(userId, { playerConfig: config } as Partial<IUser>)
  }

  async addFavorite(userId: string, fileIds: string[]): Promise<IUser | null> {
    return this.repo.addFavorite(userId, fileIds)
  }

  async removeFavorite(userId: string, fileIds: string[]): Promise<IUser | null> {
    return this.repo.removeFavorite(userId, fileIds)
  }

  async updateLastAccess(userId: string): Promise<void> {
    await this.repo.update(userId, { lastAccess: new Date().toISOString() } as Partial<IUser>)
  }
}
