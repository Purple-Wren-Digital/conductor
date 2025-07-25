# Conductor Technical Specification

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js + TypeScript | SSR + SPA, type safety |
| UI Components | React Query + Tailwind CSS | Data fetching + utility-first styling |
| Backend API | Encore TS | Backend framework with flexible queries |
| Database | PostgreSQL + Prisma ORM | Relational data + type-safe ORM |
| Auth & RBAC | Auth0 | Authentication + role-based access control |
| Notifications | SendGrid or Resend | Email notifications |
| Hosting | Vercel (Frontend) + AWS (Backend) | Scalable deployment |

## Core Features

### 1. Ticket Management System
- **Create Ticket**: 
  - Fields: title, description, category, urgency (High/Medium/Low)
  - Link to property/transaction (optional)
  - Auto-assign to department based on category
- **Ticket States**: Assigned, Awaiting Response, In Progress, Resolved
- **Ticket List View**:
  - Sortable columns: Date, Title, Status, Assigned To, Urgency, Name, Email
  - Filters: Status, Urgency, Date Range, Assigned To
  - Search functionality
- **Ticket Detail View**:
  - Comments thread
  - Status updates
  - Assignment changes
  - Action items sidebar
  - Due date management

### 2. User Roles & Permissions

```typescript
enum UserRole {
  AGENT = 'AGENT',           // Can create tickets, view own tickets
  STAFF = 'STAFF',           // Can manage assigned tickets, view all tickets
  ADMIN = 'ADMIN'            // Full access, reports, settings
}
```

### 3. Comments System
- Real-time updates using WebSockets or polling
- Markdown support
- @mentions for notifications
- Timestamps and user attribution
- Internal notes (staff-only visibility)

### 4. Notification System
- Email notifications via SendGrid/Resend:
  - Ticket created
  - Ticket assigned
  - Status changed
  - New comment
  - SLA warnings
- In-app notifications
- User notification preferences

### 5. Dashboard Views

#### Agent Dashboard
```typescript
interface AgentDashboard {
  myTickets: Ticket[];
  recentActivity: Activity[];
  quickActions: {
    createTicket: () => void;
    viewAllTickets: () => void;
  };
}
```

#### Staff Dashboard
```typescript
interface StaffDashboard {
  assignedTickets: Ticket[];
  ticketQueue: Ticket[];
  metrics: {
    avgResponseTime: number;
    openTickets: number;
    overdueTickets: number;
  };
}
```

### 6. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole
  tickets   Ticket[] @relation("TicketCreator")
  assigned  Ticket[] @relation("TicketAssignee")
  comments  Comment[]
  createdAt DateTime @default(now())
}

model Ticket {
  id          String       @id @default(cuid())
  title       String
  description String
  status      TicketStatus
  urgency     Urgency
  category    String
  
  creatorId   String
  creator     User         @relation("TicketCreator", fields: [creatorId], references: [id])
  
  assigneeId  String?
  assignee    User?        @relation("TicketAssignee", fields: [assigneeId], references: [id])
  
  comments    Comment[]
  
  dueDate     DateTime?
  resolvedAt  DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  internal  Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum TicketStatus {
  ASSIGNED
  AWAITING_RESPONSE
  IN_PROGRESS
  RESOLVED
}

enum Urgency {
  HIGH
  MEDIUM
  LOW
}

enum UserRole {
  AGENT
  STAFF
  ADMIN
}
```

### 7. API Endpoints (Encore)

```typescript
// Ticket endpoints
POST   /api/tickets              // Create ticket
GET    /api/tickets              // List tickets (filtered by role)
GET    /api/tickets/:id          // Get ticket details
PUT    /api/tickets/:id          // Update ticket
POST   /api/tickets/:id/assign   // Assign ticket
POST   /api/tickets/:id/comments // Add comment

// User endpoints
GET    /api/users/me             // Get current user
PUT    /api/users/me/preferences // Update preferences

// Dashboard endpoints
GET    /api/dashboard            // Get role-specific dashboard data
GET    /api/metrics              // Get performance metrics (admin only)
```

### 8. Frontend Routes (Next.js)

```
/                        // Dashboard (role-based)
/tickets                 // Ticket list
/tickets/new             // Create ticket
/tickets/:id             // Ticket detail
/settings                // User settings
/admin                   // Admin panel (admin only)
/admin/reports           // Reports (admin only)
```

### 9. UI Components Structure

```
components/
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Layout.tsx
├── tickets/
│   ├── TicketList.tsx
│   ├── TicketCard.tsx
│   ├── TicketDetail.tsx
│   ├── TicketForm.tsx
│   └── TicketFilters.tsx
├── comments/
│   ├── CommentList.tsx
│   ├── CommentForm.tsx
│   └── Comment.tsx
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Badge.tsx
│   └── Modal.tsx
└── dashboard/
    ├── AgentDashboard.tsx
    ├── StaffDashboard.tsx
    └── MetricCard.tsx
```

### 10. State Management

```typescript
// Using React Query for server state
const useTickets = (filters?: TicketFilters) => {
  return useQuery(['tickets', filters], () => fetchTickets(filters));
};

const useCreateTicket = () => {
  return useMutation(createTicket, {
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
    },
  });
};
```

### 11. Authentication Flow

1. User visits site → Redirect to Auth0
2. User logs in → Auth0 returns JWT
3. Store JWT in httpOnly cookie
4. Include JWT in API requests
5. Verify JWT on backend
6. Check user role for authorization

### 12. Real-time Updates

```typescript
// WebSocket or polling for ticket updates
useEffect(() => {
  const interval = setInterval(() => {
    refetchTicket();
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(interval);
}, [ticketId]);
```

### 13. Email Templates

- **Ticket Created**: "Your ticket #[ID] has been received"
- **Ticket Assigned**: "Ticket #[ID] has been assigned to [STAFF]"
- **Status Update**: "Ticket #[ID] status changed to [STATUS]"
- **New Comment**: "[USER] commented on ticket #[ID]"

### 14. Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=
```

### 15. Development Priorities

1. **Sprint 1**: Auth setup, database schema, basic ticket CRUD
2. **Sprint 2**: Ticket list/detail views, assignment flow
3. **Sprint 3**: Comments, notifications, real-time updates
4. **Sprint 4**: Dashboards, metrics, reporting
5. **Sprint 5**: Polish, testing, performance optimization
6. **Sprint 6**: User settings, preferences, final touches

## Key Technical Decisions

- **Monorepo**: Single repository for frontend and backend
- **Type Safety**: TypeScript everywhere, Prisma for DB
- **API Design**: RESTful with Encore TS
- **Styling**: Tailwind CSS with custom design tokens
- **Data Fetching**: React Query for caching and synchronization
- **Forms**: React Hook Form with Zod validation
- **Testing**: Jest + React Testing Library + Cypress

# Conductor Project Guide

## Project Overview
Conductor is a [brief description of what your app does]. Built with Next.js frontend and Encore backend.

## Architecture
- **Frontend**: Next.js 14+ with Auth0 authentication
- **Backend**: Encore framework with TypeScript
- **Auth**: Auth0 with JWT tokens
- **Database**: [your database if any]

## Development Setup
```bash
# Frontend
cd frontend && npm run dev

# Backend  
cd backend && encore run

# Tests
cd backend && npm test
```

## Common Commands
- `npm run lint` - Lint frontend code
- `npm run typecheck` - TypeScript checking
- [Add other common commands you use]

## Authentication Flow
- Frontend uses Auth0 NextJS SDK v4
- Backend validates JWT tokens with Auth0 public certificate
- Access tokens passed via `Authorization: Bearer <token>` header

## Project Structure
```
conductor/
├── frontend/          # Next.js app
├── backend/           # Encore services
│   ├── admin/         # Admin dashboard APIs
│   ├── auth/          # Authentication handling
│   └── subscription/  # Stripe integration (commented out)
```

## Environment Variables
[List key environment variables and their purpose]

## Known Issues
- [Any current issues or quirks]

## Notes for Claude
- Always run lint/typecheck after code changes
- Use existing error handling patterns (APIError class)
- Follow Auth0 v4 patterns for authentication
- Test endpoints with `/health` for connectivity