import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'
import { AllowedUserRepository } from '@/lib/repositories/AllowedUserRepository'
import { AllowedUserService } from '@/lib/services/AllowedUserService'
import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
import { TraineeService } from '@/lib/services/TraineeService'
import { handleClerkUserCreated } from '@/lib/services/ClerkWebhookHandler'

// Mock Clerk API
const mockUpdateMetadata = jest.fn()
const mockDeleteUser = jest.fn()

jest.mock('@clerk/nextjs/server', () => ({
  clerkClient: jest.fn().mockResolvedValue({
    users: {
      updateUserMetadata: (...args: unknown[]) => mockUpdateMetadata(...args),
      deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    },
  }),
}))

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  jest.clearAllMocks()
  await db.prisma.trainee.deleteMany()
  await db.prisma.allowedUser.deleteMany()
})

function makeServices() {
  const allowedUserService = new AllowedUserService(new AllowedUserRepository(db.prisma))
  const traineeService = new TraineeService(new TraineeRepository(db.prisma))
  return { allowedUserService, traineeService }
}

describe('handleClerkUserCreated', () => {
  it('sets trainer role when email is in AllowedUser as trainer', async () => {
    await db.prisma.allowedUser.create({ data: { email: 'trainer@example.com', role: 'trainer' } })
    const { allowedUserService, traineeService } = makeServices()

    await handleClerkUserCreated('user_123', 'trainer@example.com', allowedUserService, traineeService)

    expect(mockUpdateMetadata).toHaveBeenCalledWith('user_123', { publicMetadata: { role: 'trainer' } })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('sets trainee role and links clerkUserId when email is trainee', async () => {
    await db.prisma.allowedUser.create({ data: { email: 'trainee@example.com', role: 'trainee' } })
    await db.prisma.trainee.create({ data: { name: 'Alice', email: 'trainee@example.com' } })
    const { allowedUserService, traineeService } = makeServices()

    await handleClerkUserCreated('user_456', 'trainee@example.com', allowedUserService, traineeService)

    expect(mockUpdateMetadata).toHaveBeenCalledWith('user_456', { publicMetadata: { role: 'trainee' } })
    const trainee = await db.prisma.trainee.findUnique({ where: { email: 'trainee@example.com' } })
    expect(trainee?.clerkUserId).toBe('user_456')
  })

  it('deletes Clerk user when email is not in AllowedUser', async () => {
    const { allowedUserService, traineeService } = makeServices()

    await handleClerkUserCreated('user_789', 'nobody@example.com', allowedUserService, traineeService)

    expect(mockDeleteUser).toHaveBeenCalledWith('user_789')
    expect(mockUpdateMetadata).not.toHaveBeenCalled()
  })
})
