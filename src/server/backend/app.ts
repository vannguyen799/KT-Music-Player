import { TruxieFactory, type EventEmitter2 } from 'truxie'
import { AppModule } from './modules/app.module'
import { AppErrorFilter } from './filters/app-error.filter'
import { connectDatabase } from './shared/database'
import { User } from './modules/core/domain/user/user.model'

// Connect to MongoDB before creating the app
await connectDatabase()

// Seed default admin user if not exists
const adminExists = await User.findOne({ username: 'admin' })
if (!adminExists) {
  await User.create({ username: 'admin', password: 'admin', role: 0 })
  console.log('Default admin user created (username: admin)')
}

const app = await TruxieFactory.create(AppModule, {
  globalFilters: [new AppErrorFilter()],
})

app.setGlobalPrefix('api')

export function resolve<T>(token: any): Promise<T> {
  return app.resolve<T>(token)
}

export function getEventEmitter(): EventEmitter2 {
  return app.getEventEmitter()
}

export { app }
