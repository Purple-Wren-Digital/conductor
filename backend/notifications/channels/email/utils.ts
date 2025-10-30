import * as React from "react";
import type { Notification } from "../../types";
import UserInvitation from "@/emails/UserInvitation";
import MarketCenterAssignment from "@/emails/MarketCenterUserUpdate";
import CategoryAssignment from "@/emails/CategoryAssignment";
import CreatedTicketNotification from "@/emails/CreatedTicketNotification";
import EditedTicketNotification from "@/emails/EditedTicketNotification";
import QuickEditTicketNotification from "@/emails/QuickEditTicketNotification";

export const formatEmailNotification = (notification: Notification) => {
  // USERS
  if (notification?.data?.invitation) {
    const invite = UserInvitation(
      notification.data.invitation
    ) as React.ReactElement;
    console.log("INVITE EMAIL?", invite);
    return invite;
  }

  // MARKET CENTERS

  if (notification?.data?.marketCenterAssignment) {
    const createdTicket = MarketCenterAssignment(
      notification.data.marketCenterAssignment
    ) as React.ReactElement;
    return createdTicket;
  }

  if (notification?.data?.categoryAssignment) {
    const createdTicket = CategoryAssignment(
      notification.data.categoryAssignment
    ) as React.ReactElement;
    return createdTicket;
  }

  // TICKETS
  if (notification?.data?.createdTicket) {
    const createdTicket = CreatedTicketNotification(
      notification.data.createdTicket
    ) as React.ReactElement;
    return createdTicket;
  }

  // if (notification?.data?.editedTicket) {
  //   const createdTicket = EditedTicketNotification(notification.data.editedTicket) as React.ReactElement;
  //   return createdTicket;
  // }

  // COMMENTS

  return null;
};
