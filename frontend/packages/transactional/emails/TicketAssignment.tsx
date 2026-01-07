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
import { AssignedTicketNotificationProps } from "./types";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.FRONTEND_URL;

const TicketAssignment = ({
  ticketNumber,
  ticketTitle,
  createdOn,
  updatedOn,
  editorName,
  editorId,
  currentAssignment,
  previousAssignment,
  updateType,
}: AssignedTicketNotificationProps) => {
  const currentUserName = currentAssignment ?? "Hello";
  const previousUserName = previousAssignment ?? "Hello";
  return (
    <Html>
      <Head />
      <Preview>A ticket was {updateType} to your queue</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Ticket Assignment</Text>

            <Text style={datesText}>
              {updatedOn &&
                `Updated: ${new Date(updatedOn).toLocaleDateString()}`}
            </Text>
            <Text style={datesText}>
              {createdOn &&
                `Created: ${new Date(createdOn).toLocaleDateString()}`}
            </Text>
          </Section>

          <Section style={divider} />

          <Section>
            <Section style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>
                {updateType === "added" ? currentUserName : previousUserName},
              </Text>
              <Text style={subheaderText}>
                The following ticket is{" "}
                {updateType === "added" ? "now" : "no longer"} in your queue
              </Text>
            </Section>
            <Text style={subheaderText}>Title: {ticketTitle}</Text>
            <Text style={subheaderText}>Id: {ticketNumber}</Text>
            <Text style={subheaderText}>
              Assigned By: {editorName}
              {editorId && ` #${editorId.slice(0, 8)})`}
            </Text>
          </Section>

          <Section>
            <Text style={subheaderText}>Details</Text>

            <Section style={{ marginLeft: 10 }}>
              <Text style={text}>Current: {currentAssignment}</Text>
              <Text style={text}>Previous: {previousAssignment}</Text>
            </Section>
            <Button
              href={`${APP_BASE_URL}/dashboard/tickets/${ticketNumber}`} // TODO: Production url
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

export default TicketAssignment;

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
const datesText = {
  fontSize: "16px",
  fontWeight: "semibold",
  color: "gray",
};
const subheaderText = { fontSize: "20px", fontWeight: "semibold" };
const text = {
  fontSize: "16px",
  fontWeight: "semibold",
};

const divider = {
  backgroundColor: "lightgray",
  height: ".75px",
  marginTop: "10px",
  marginBottom: "10px",
  borderRadius: "10px",
  opacity: "50%",
};

const button = {
  backgroundColor: "black",
  color: "white",
  padding: "12px",
  textDecoration: "none",
  borderRadius: "10px",
  marginTop: "20px",
};
