import type { Ticket } from "../ticket/types";
import type { MarketCenter } from "../marketCenters/types";
import type { User } from "../user/types";

export interface Survey {
  id: string;
  completed: boolean;
  ticketId: string;
  surveyorId: string;
  assigneeId?: string | null;
  marketCenterId: string | null;
  overallRating: number | null;
  assigneeRating: number | null;
  marketCenterRating: number | null;
  comment: string | null;
  createdAt: Date;
  updatedAt?: Date;
  ticket?: Ticket;
  surveyor?: User;
  assignee?: User;
  marketCenter?: MarketCenter;
}

export interface SurveyResults {
  totalSurveys?: number;
  overallAverageRating?: number;
  assigneeAverageRating?: number;
  marketCenterAverageRating?: number;
}
