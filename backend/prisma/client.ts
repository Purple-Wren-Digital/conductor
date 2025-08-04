import { PrismaClient, Role, Priority, TicketStatus, CommentType  } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())