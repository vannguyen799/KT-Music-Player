import { Inject, Controller, Get, NoGuard } from 'truxie'
import { CategoryRepository } from '../domain/category'
import { sendSuccess } from '$backend/shared/response'

@Inject(CategoryRepository)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  @Get('/')
  @NoGuard()
  async getAll() {
    const all = await this.categoryRepo.findAll()
    return sendSuccess(all.filter((c) => !c.disabled))
  }
}
