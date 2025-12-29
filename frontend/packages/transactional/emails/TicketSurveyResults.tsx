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
import { SurveyResultsProps } from "./types";

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
// New Survey Results Available for Ticket #{{ticketNumber}}
const TicketSurveyResults = ({
  ticketNumber,
  ticketTitle,
  staffName,
}: SurveyResultsProps) => {
  return (
    <Html>
      <Head />
      <Preview>Survey Results Available</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Survey Results Available</Text>
          </Section>

          <div style={divider} />

          <Section>
            <Text style={text}>Hello {staffName},</Text>
            <Text style={text}>
              A survey has been completed for ticket, &quot;{ticketTitle}
              &quot; in your market center.
            </Text>
            <Text style={text}>
              You may now view the ratings and comments provided by the
              ticket&apos;s creator.
            </Text>
          </Section>
          <Section>
            <Button
              href={`${APP_BASE_URL}/dashboard/tickets/${ticketNumber}`}
              style={button}
            >
              View Survey Results
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketSurveyResults;

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
  padding: "10px",
  textDecoration: "none",
  borderRadius: "10px",
  marginVertical: "20px",
};
