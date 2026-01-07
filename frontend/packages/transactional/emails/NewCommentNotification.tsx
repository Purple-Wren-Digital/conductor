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
import { NewCommentNotificationProps } from "./types";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.FRONTEND_URL;

const NewCommentNotification = ({
  ticketNumber,
  ticketTitle,
  createdOn,
  commenterName,
  commenterId,
  comment,
  isInternal,
}: NewCommentNotificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Comment: &quot;{comment}&quot;</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>New Comment from {commenterName}</Text>
            <Text style={datesText}>
              {createdOn &&
                `Ticket Created: ${new Date(createdOn).toLocaleDateString()}`}
            </Text>
          </Section>

          <Section style={divider} />

          <Section>
            <Text style={subheaderText}>Ticket Title: {ticketTitle}</Text>
            <Text style={subheaderText}>
              Ticket Id: {ticketNumber.slice(0, 8)}
            </Text>
            <Text style={subheaderText}>Comment Details:</Text>
          </Section>

          <Section>
            <div style={commentContainer}>
              {isInternal && <Text style={isInternalText}>Internal Only</Text>}
              <Text style={text}>&quot;{comment}&quot;</Text>
              <Text style={text}>
                Author: {commenterName}
                {commenterId && ` (#${commenterId.slice(0, 8)})`}
              </Text>
            </div>

            <Button
              href={`${APP_BASE_URL}/dashboard/tickets/${ticketNumber}`}
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

export default NewCommentNotification;

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
const isInternalText = {
  fontSize: "14px",
  fontWeight: "semibold",
  color: "darkred",
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

const commentContainer = {
  backgroundColor: "lightgray",
  padding: "10px 20px",
  borderRadius: "10px",
};
