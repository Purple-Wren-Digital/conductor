import { MarketCenter } from "@/lib/types";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type MarketCenterUserUpdateProps = {
  userUpdate: "added" | "removed";
  marketCenter: MarketCenter;
  userName: string;
  editorName: string;
  editorEmail: string;
};

const MarketCenterUserUpdate = ({
  userUpdate,
  userName,
  editorName,
  editorEmail,
  marketCenter,
}: MarketCenterUserUpdateProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        You've been {userUpdate === "added" ? "added to" : "removed from"}
        {marketCenter?.name ? marketCenter.name : "a market center"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>
              You've been added to
              {marketCenter?.name ? marketCenter.name : "a market center"}
            </Text>
          </Section>

          <div style={divider} />

          <Section>
            <div style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>{userName}John Doe,</Text>
              <Text style={subheaderText}>
                {editorName} added you to their team!
              </Text>
            </div>

            {/* <Text style={subheaderText}>
              <b>Invitation Details</b>
            </Text>

            <Text style={labelText}>Name: {userName}</Text>
            <Text style={labelText}>Email: {userEmail}</Text>
          */}

            <Text style={subheaderText}>
              <b>Market Center Details</b>
            </Text>

            <Text style={labelText}>
              Market Center: {marketCenter?.name ? marketCenter.name : "N/A"}
            </Text>
            <Text style={labelText}>
              Id:{" "}
              {marketCenter?.id ? `#${marketCenter?.id.slice(0, 8)}` : "N/A"}
            </Text>
            {/*  <Text style={labelText}>
              Manager: {userRole}
            marketCenter?.users.length 
            </Text>*/}
            {/* <Text style={text}>
              Click below to set your password and sign up with this email
              address:
            </Text>
            <Button href={inviteLink} style={button}>
              Sign up
            </Button> */}

            <Text style={datesText}>
              If any of this information is incorrect, please contact{" "}
              {editorName} at {editorEmail} to resolve any issues.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MarketCenterUserUpdate;

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
