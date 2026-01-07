import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { MarketCenterAssignmentProps } from "./types";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.FRONTEND_URL;

const MarketCenterAssignment = ({
  userUpdate,
  userName,
  editorName,
  editorEmail,
  marketCenterName,
  marketCenterId,
}: MarketCenterAssignmentProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been {userUpdate === "added" ? "added to" : "removed from"}
        {marketCenterName ? marketCenterName : "a market center"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>
              Market Center Assignment: {marketCenterName}
            </Text>
          </Section>

          <div style={divider} />

          <Section>
            <div style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>{userName},</Text>
              <Text style={subheaderText}>
                {editorName}{" "}
                {userUpdate === "added" ? "added you to" : "removed you from"}
                their team.
              </Text>
            </div>

            <Text style={subheaderText}>Market Center Details</Text>

            <Text style={labelText}>
              Market Center: {marketCenterName ? marketCenterName : "N/A"}
            </Text>
            <Text style={labelText}>
              Id: {marketCenterId ? `#${marketCenterId.slice(0, 8)}` : "N/A"}
            </Text>

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

export default MarketCenterAssignment;

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
