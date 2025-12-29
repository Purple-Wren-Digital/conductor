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

// const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL;

export interface CustomizableEmailProps {
  // Content sections
  subject: string;
  greeting: string;
  mainMessage: string; // Can contain HTML from rich text editor
  buttonText: string | null;
  buttonUrl: string | null;

  // Detail fields to display
  visibleFieldsData: { label: string; value: string }[];

  // Preview text for email client
  previewText?: string;
}

/**
 * A customizable email template that renders admin-defined content.
 * Used when a market center has customized their email templates.
 */
const CustomizableEmail = ({
  subject,
  greeting,
  mainMessage,
  buttonText,
  buttonUrl,
  visibleFieldsData,
  previewText,
}: CustomizableEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText || subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section>
            <Text style={conductorText}>Conductor Ticketing</Text>
            <Text style={headerText}>{subject}</Text>
          </Section>

          <div style={divider} />

          {/* Greeting */}
          <Section>
            <Text style={greetingText}>{greeting}</Text>
          </Section>

          {/* Main Message - supports HTML from rich text editor */}
          <Section>
            <div
              style={messageContainer}
              dangerouslySetInnerHTML={{ __html: mainMessage }}
            />
          </Section>

          {/* Detail Fields */}
          {visibleFieldsData && visibleFieldsData.length > 0 && (
            <Section style={detailsSection}>
              <Text style={subheaderText}>Details</Text>
              {visibleFieldsData.map((field, index) => (
                <Text key={index} style={labelText}>
                  {field.label}: {field.value}
                </Text>
              ))}
            </Section>
          )}

          {/* CTA Button */}
          {buttonText && buttonUrl && (
            <Section style={buttonSection}>
              <Button href={buttonUrl} style={button}>
                {buttonText}
              </Button>
            </Section>
          )}

          {/* Footer */}
          <div style={divider} />
          <Section>
            <Text style={footerText}>
              This email was sent by Conductor Ticketing. If you have questions,
              please contact your market center administrator.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CustomizableEmail;

// Styles matching the existing email templates
const main = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  backgroundColor: "#ffffff",
};

const container = {
  padding: "20px",
  maxWidth: "600px",
  margin: "0 auto",
};

const conductorText = {
  color: "black",
  fontWeight: "bold" as const,
  fontSize: "16px",
  marginBottom: "8px",
};

const headerText = {
  fontSize: "22px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  marginBottom: "16px",
};

const divider = {
  backgroundColor: "lightgray",
  height: "1px",
  marginTop: "16px",
  marginBottom: "16px",
  borderRadius: "10px",
  opacity: "50%",
};

const greetingText = {
  fontSize: "16px",
  color: "#333333",
  marginBottom: "8px",
};

const messageContainer = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#333333",
  marginBottom: "24px",
};

const detailsSection = {
  backgroundColor: "#f9f9f9",
  padding: "16px",
  borderRadius: "8px",
  marginBottom: "24px",
};

const subheaderText = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  marginBottom: "12px",
};

const labelText = {
  fontSize: "14px",
  color: "#555555",
  marginBottom: "8px",
};

const buttonSection = {
  textAlign: "center" as const,
  marginTop: "24px",
  marginBottom: "24px",
};

const button = {
  backgroundColor: "black",
  color: "white",
  padding: "12px 24px",
  textDecoration: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "500" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#888888",
  textAlign: "center" as const,
};
