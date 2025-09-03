import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type CreatedTicketEmailProps = {
  ticketNumber: string;
  ticketTitle: string;
  creatorName: string;
  creatorId: string;
  createdOn: Date;
  dueDate?: Date;
};

export const CreatedTicketTemplate = ({
  ticketTitle,
  ticketNumber,
  creatorName,
  creatorId,
  createdOn,
  dueDate,
}: CreatedTicketEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Ticket {ticketNumber} Created Successfully</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Ticket Created Successfully</Text>
          </Section>

          <div style={divider} />

          <Section>
            <Text style={ticketDetailsText}>
              Created On:
              {createdOn &&
                `${new Date(createdOn).toLocaleDateString()} at
                ${new Date(createdOn).toLocaleTimeString()}`}
            </Text>
            <Text style={ticketDetailsText}>Title: {ticketTitle}</Text>
            <Text style={ticketDetailsText}>Id: #{ticketNumber}</Text>
            {dueDate && (
              <Text style={ticketDetailsText}>
                Due: #{new Date(dueDate).toLocaleDateString()}
              </Text>
            )}
            <Text style={ticketDetailsText}>
              Created By: {creatorName}, {creatorId}
            </Text>

            <Text style={text}>
              You may view and manage your ticket by clicking the link below.
            </Text>
            <Button
              href={`http://localhost:3000/dashboard/tickets/${ticketNumber}`} // TODO: Production url
              style={button}
            >
              View Ticket #{ticketNumber}
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CreatedTicketTemplate;

const main = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};
const container = { padding: "20px" };
const conductorText = {
  color: "black",
  fontWeight: "bold",
  fontSize: 16,
  marginBottom: "8px",
};
const headerText = { fontSize: "22px", fontWeight: "semibold" };
const divider = {
  backgroundColor: "lightgray",
  height: ".75px",
  marginTop: "10px",
  marginBottom: "10px",
  borderRadius: "10px",
  opacity: "50%",
};
const ticketDetailsText = { fontSize: "18px", fontWeight: "semibold" };
const text = {
  fontSize: "16px",
  marginTop: "40px",
  marginBottom: "40px",
};
const button = {
  backgroundColor: "black",
  color: "white",
  padding: "12px",
  textDecoration: "none",
  borderRadius: "10px",
};
