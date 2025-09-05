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
import type { User as UserType } from "@/lib/types";

export type ReassignedTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date;
  updatedOn: Date;
  editedBy: UserType;
  currentAssignment: UserType | null;
  previousAssignment: UserType | null;
};

const ReassignedTicketNotification = ({
  ticketNumber,
  ticketTitle,
  createdOn,
  updatedOn,
  editedBy,
  currentAssignment,
  previousAssignment,
}: ReassignedTicketNotificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Ticket Reassigned</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Ticket Reassigned</Text>

            <Text style={datesText}>
              {updatedOn &&
                `Updated: ${new Date(updatedOn).toLocaleDateString()}`}
            </Text>
            <Text style={datesText}>
              {createdOn &&
                `Created: ${new Date(createdOn).toLocaleDateString()}`}
            </Text>
          </Section>

          <div style={divider} />

          <Section>
            <Text style={subheaderText}>Title: {ticketTitle}</Text>
            <Text style={subheaderText}>Id: {ticketNumber}</Text>
            <Text style={subheaderText}>
              Reassigned By: {editedBy?.name}{" "}
              {editedBy?.id && `(${editedBy.id})`}
            </Text>
          </Section>

          <Section>
            <Text style={subheaderText}>Details</Text>

            <div style={{ marginLeft: 10 }}>
              <ul>
                <li>
                  <Text style={text}>
                    Current: {currentAssignment?.name}{" "}
                    {currentAssignment?.id && `(${currentAssignment.id})`}
                  </Text>
                </li>
                <li>
                  <Text style={text}>
                    Previous:{" "}
                    {previousAssignment?.name
                      ? previousAssignment.name
                      : "Unassigned"}{" "}
                    {previousAssignment?.id && `(${previousAssignment.id})`}
                  </Text>
                </li>
              </ul>
            </div>
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

export default ReassignedTicketNotification;

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
