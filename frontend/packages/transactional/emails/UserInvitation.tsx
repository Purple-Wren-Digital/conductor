import { NewUserInvitationProps } from "./types";
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

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.FRONTEND_URL;

const NewUserInvitation = ({
  newUserName,
  newUserEmail,
  newUserRole,
  newUserMarketCenter,
  inviterName,
  inviterEmail,
}: NewUserInvitationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Join Conductor Ticketing</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Join Conductor Ticketing</Text>
          </Section>

          <Section style={divider} />

          <Section>
            <Section style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>{newUserName},</Text>
              <Text style={subheaderText}>
                {inviterName} sent you an invite to join Conductor Ticketing!
              </Text>
            </Section>

            <Text style={subheaderText}>
              <b>Invitation Details</b>
            </Text>

            <Text style={labelText}>Name: {newUserName}</Text>
            <Text style={labelText}>Email: {newUserEmail}</Text>
            <Text style={labelText}>Role: {newUserRole}</Text>
            {newUserMarketCenter && (
              <Text style={labelText}>
                Market Center: {newUserMarketCenter}
              </Text>
            )}

            <Text style={text}>
              Click below to set your password and sign up with this email
              address:
            </Text>
            <Button href={`${APP_BASE_URL}`} style={button}>
              Sign up
            </Button>

            <Text style={datesText}>
              If any of this information is incorrect, please contact{" "}
              {inviterName} at {inviterEmail} to resend an invitation with your
              correct details.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NewUserInvitation;

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
  marginTop: "40px",
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
