  CREATE TABLE tickets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(500) NOT NULL,
      description TEXT NOT NULL,
      status ticket_status DEFAULT 'OPEN',
      priority priority DEFAULT 'MEDIUM',
      category VARCHAR(100) NOT NULL,
      creator_id UUID NOT NULL REFERENCES users(id),
      assignee_id UUID REFERENCES users(id),
      market_center_id UUID NOT NULL REFERENCES market_centers(id),
      due_date TIMESTAMP WITH TIME ZONE,
      resolved_at TIMESTAMP WITH TIME ZONE,
      closed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Performance indexes for common queries
  CREATE INDEX idx_tickets_status ON tickets(status);
  CREATE INDEX idx_tickets_priority ON tickets(priority);
  CREATE INDEX idx_tickets_creator ON tickets(creator_id);
  CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
  CREATE INDEX idx_tickets_market_center ON tickets(market_center_id);

  -- Composite indexes for common filter combinations
  CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
  CREATE INDEX idx_tickets_assignee_status ON tickets(assignee_id, status);
  CREATE INDEX idx_tickets_market_status ON tickets(market_center_id, status);

  -- Time-based queries (very common in ticket systems)
  CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
  CREATE INDEX idx_tickets_updated_at ON tickets(updated_at DESC);

  -- Full-text search on title and description
  CREATE INDEX idx_tickets_search ON tickets USING GIN(to_tsvector('english', title || ' ' || description));