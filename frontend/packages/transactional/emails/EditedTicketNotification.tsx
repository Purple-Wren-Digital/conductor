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
import { ActivityUpdates, UpdatedTicketProps } from "./types";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.FRONTEND_URL;

const UpdatedTicket = ({
  ticketNumber,
  ticketTitle,
  createdOn,
  updatedOn,
  editorName,
  editorId,
  changedDetails,
}: UpdatedTicketProps) => {
  const changes: ActivityUpdates[] =
    (changedDetails as ActivityUpdates[]) || [];
  return (
    <Html>
      <Head />
      <Preview>Edits Made to Ticket #{ticketNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Edits Made to Ticket: {ticketTitle}</Text>

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
            <Text style={subheaderText}>Id: {ticketNumber}</Text>
            <Text style={subheaderText}>
              Edited by: {editorName ?? "N/A"}
              {editorId && ` (#${editorId.slice(0, 8)})`}
            </Text>
          </Section>

          <Section>
            <Text style={subheaderText}>
              Updates ({changes ? changes.length : "0"})
            </Text>
            {changes &&
              changes.length &&
              changes.map((detail, index) => {
                return (
                  <div key={index} style={{ marginLeft: 10 }}>
                    <Text style={labelText}>
                      ({index + 1}) {detail?.label}
                    </Text>
                    <ul>
                      <li>
                        <Text style={text}>
                          Current:{" "}
                          {detail?.newValue ? `'${detail.newValue}'` : "N/A"}
                        </Text>
                      </li>
                      <li>
                        <Text style={text}>
                          Previous:{" "}
                          {detail?.originalValue
                            ? `'${detail.originalValue}'`
                            : "N/A"}
                        </Text>
                      </li>
                    </ul>
                  </div>
                );
              })}
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

export default UpdatedTicket;

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
const labelText = { fontSize: "18px", fontWeight: "semibold" };
const text = { fontSize: "16px", fontWeight: "semibold" };

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
