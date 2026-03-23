import { Inject, Controller, Get, RouteGuards } from 'truxie'
import { AdminGuard } from '$backend/guards/auth.guard'
import { CategoryRepository } from '../domain/category'
import { sendSuccess } from '$backend/shared/response'

@Inject(CategoryRepository)
@Controller('categories')
@RouteGuards(AdminGuard)
export class CategoryController {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  @Get('/')
  async getAll() {
    const all = await this.categoryRepo.findAll()
    return sendSuccess(all.filter((c) => !c.disabled))
  }
}
