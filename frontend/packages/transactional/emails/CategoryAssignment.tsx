import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { CategoryAssignmentProps } from "./types";

const APP_BASE_URL = process.env.APP_BASE_URL; // TODO: Production url

const CategoryAssignment = ({
  categoryName,
  categoryDescription,
  userUpdate,
  userName,
  editorName,
  editorEmail,
  marketCenterName,
  marketCenterId,
}: CategoryAssignmentProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been{" "}
        {userUpdate === "added" ? "assigned to" : "unassigned from"} a ticket
        category
        {categoryName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>
              Ticket Category Assignment: {categoryName}
            </Text>
          </Section>

          <div style={divider} />

          <Section>
            <div style={{ marginBottom: "40px" }}>
              <Text style={subheaderText}>{userName},</Text>
              <Text style={subheaderText}>
                You will {userUpdate === "added" ? "now" : "no longer"} be
                automatically assigned to tickets created under {categoryName}.
              </Text>
            </div>

            <Text style={subheaderText}>
              <b>Category Details</b>
            </Text>
            <Text style={labelText}>
              Name: {marketCenterName ? marketCenterName : "N/A"}
            </Text>
            <Text style={labelText}>
              Description: {categoryDescription ?? "No description provided"}
            </Text>
            <Text style={labelText}>
              Name: {marketCenterName ? marketCenterName : "N/A"}
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

export default CategoryAssignment;

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
