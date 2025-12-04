import * as React from "react";
import type { Notification } from "../../types";
import {
  CategoryAssignment,
  CreatedTicketNotification,
  MarketCenterAssignment,
  NewCommentNotification,
  TicketAssignment,
  TicketSurvey,
  TicketSurveyResults,
  UpdatedTicket,
  UserInvitation,
} from "@/emails/index";

export const formatEmailNotification = (notification: Notification) => {
  // USERS
  if (notification?.data?.invitation) {
    const invite = UserInvitation(
      notification.data.invitation
    ) as React.ReactElement;
    return invite;
  }

  // MARKET CENTERS
  if (notification?.data?.marketCenterAssignment) {
    const marketCenterAssignment = MarketCenterAssignment(
      notification.data.marketCenterAssignment
    ) as React.ReactElement;
    return marketCenterAssignment;
  }

  if (notification?.data?.categoryAssignment) {
    const categoryAssignment = CategoryAssignment(
      notification.data.categoryAssignment
    ) as React.ReactElement;
    return categoryAssignment;
  }

  // TICKETS
  if (notification?.data?.createdTicket) {
    const createdTicket = CreatedTicketNotification(
      notification.data.createdTicket
    ) as React.ReactElement;
    return createdTicket;
  }

  if (notification?.data?.ticketAssignment) {
    const assignedTicket = TicketAssignment(
      notification.data.ticketAssignment
    ) as React.ReactElement;
    return assignedTicket;
  }

  if (notification?.data?.updatedTicket) {
    const updatedTicket = UpdatedTicket(
      notification.data.updatedTicket
    ) as React.ReactElement;
    return updatedTicket;
  }

  if (notification?.data?.newComment) {
    const newComment = NewCommentNotification(
      notification.data.newComment
    ) as React.ReactElement;
    return newComment;
  }

  if (notification?.data?.ticketSurvey) {
    const ticketSurvey = TicketSurvey(
      notification.data.ticketSurvey
    ) as React.ReactElement;
    return ticketSurvey;
  }

  if (notification?.data?.surveyResults) {
    const surveyResults = TicketSurveyResults(
      notification.data.surveyResults
    ) as React.ReactElement;
    return surveyResults;
  }

  // TODO: Weekly/Daily Summary Reports

  return null;
};
