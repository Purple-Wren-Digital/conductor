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
import type { PrismaUser as UserType } from "@/lib/types";

export type NewCommentNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date;
  commenter: UserType;
  comment: string;
  isInternal: Boolean;
  assignee: UserType | null;
};

const NewCommentNotification = ({
  ticketNumber,
  ticketTitle,
  createdOn,
  commenter,
  comment,
  isInternal,
}: NewCommentNotificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Comment: "{comment}"</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>New Comment from {commenter?.name}</Text>
            <Text style={datesText}>
              {createdOn &&
                `Ticket Created: ${new Date(createdOn).toLocaleDateString()}`}
            </Text>
          </Section>

          <div style={divider} />

          <Section>
            <Text style={subheaderText}>Ticket Title: {ticketTitle}</Text>
            <Text style={subheaderText}>Ticket Id: {ticketNumber}</Text>
            <Text style={subheaderText}>Comment Details:</Text>
          </Section>

          <Section>
            <div style={commentContainer}>
              {isInternal && <Text style={isInternalText}>Internal Only</Text>}
              <Text style={text}>"{comment}"</Text>
              <Text style={text}>
                Author: {commenter?.name} {commenter?.id && `(${commenter.id})`}
              </Text>
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
