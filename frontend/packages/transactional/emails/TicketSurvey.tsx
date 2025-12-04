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
import { TicketSurveyProps } from "./types";

const APP_BASE_URL = process.env.APP_BASE_URL; // TODO: Production url

const TicketSurvey = ({
  ticketNumber,
  ticketTitle,
  surveyorName,
}: TicketSurveyProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Feedback Helps Us Improve</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>How did we do?</Text>
          </Section>

          <div style={divider} />

          <Section>
            <Text style={text}>Hello {surveyorName},</Text>
            <Text style={text}>
              Your ticket, &quot;{ticketTitle},&quot; was marked as resolved.
            </Text>
            <Text style={text}>
              Please take a moment to provide feedback about your experience. Thank
              you!
            </Text>
          </Section>
          <Section>
            <Button
              href={`${APP_BASE_URL}/dashboard/tickets/${ticketNumber}`}
              style={button}
            >
              Complete Survey
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketSurvey;

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
