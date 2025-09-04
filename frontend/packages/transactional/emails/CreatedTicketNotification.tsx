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

type CreatedTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  creatorName: string;
  creatorId: string;
  createdOn: Date;
  dueDate?: Date;
};

const CreatedTicketNotification = ({
  ticketTitle,
  ticketNumber,
  creatorName,
  creatorId,
  createdOn,
  dueDate,
}: CreatedTicketNotificationProps) => {
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
            <Text style={subheaderText}>Details</Text>
            <Text style={labelText}>
              Created On:
              {createdOn &&
                `${new Date(createdOn).toLocaleDateString()} at
                ${new Date(createdOn).toLocaleTimeString()}`}
            </Text>
            <Text style={labelText}>Title: {ticketTitle}</Text>
            <Text style={labelText}>Id: {ticketNumber}</Text>
            {dueDate && (
              <Text style={labelText}>
                Due: {new Date(dueDate).toLocaleDateString()}
              </Text>
            )}
            <Text style={labelText}>
              Created By: {creatorName && creatorName}
              {creatorId && `(${creatorId})`}
            </Text>

            <Text style={text}>
              You may view and manage your ticket by clicking the link below.
            </Text>
            <Button
              href={`http://localhost:3000/dashboard/tickets/${ticketNumber}`} // TODO: Production url
              style={button}
            >
              View Ticket
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CreatedTicketNotification;

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

const subheaderText = { fontSize: "20px", fontWeight: "semibold" };
const labelText = { fontSize: "18px", fontWeight: "semibold" };
const datesText = {
  fontSize: "16px",
  fontWeight: "semibold",
  color: "gray",
};
const text = {
  fontSize: "16px",
  fontWeight: "semibold",
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
