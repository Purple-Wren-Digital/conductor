import { UserRole } from "@/lib/types";
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

type NewUserInvitationProps = {
  newUserName: string;
  newUserId: string;
  newUserEmail: string;
  newUserRole: UserRole;
  inviterName: string;
  inviterId: string;
  inviterEmail: string;
};

const NewUserInvitation = ({
  newUserName,
  newUserId,
  newUserEmail,
  newUserRole,
  inviterName,
  inviterId,
  inviterEmail,
}: NewUserInvitationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Invitation to join Conductor Ticketing</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>Invitation to Conductor Ticketing</Text>
          </Section>

          <div style={divider} />

          <Section>
            <div style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>Victoria,</Text>
              <Text style={subheaderText}>
                Jane Doe sent you an invite to join their team on Conductor!
              </Text>
            </div>

            <Text style={subheaderText}>
              <b>Invitation Details</b>
            </Text>

            <Text style={labelText}>Name: Victoria McNorrill</Text>
            <Text style={labelText}>Email: email@testing.com</Text>
            <Text style={labelText}>Role: Agent</Text>

            <Text style={text}>
              Click below to sign up now with this email address.
            </Text>
            <Button
              // href={`http://localhost:3000/}`} // TODO: Production url
              style={button}
            >
              Sign up
            </Button>

            <Text style={datesText}>
              If any of this information is incorrect, please contact Jane Doe
              to resend an invitation with your correct details.
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
