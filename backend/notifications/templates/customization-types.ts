import { NotificationCategory } from "../types";

// =============================================================================
// TEMPLATE TYPES - All customizable notification template types
// =============================================================================

/**
 * Enum of all notification types that can have customized templates.
 * These map to the "type" field in notifications.
 */
export type CustomizableTemplateType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNMENT"
  | "NEW_COMMENTS"
  | "MARKET_CENTER_ASSIGNMENT"
  | "CATEGORY_ASSIGNMENT"
  | "TICKET_SURVEY"
  | "TICKET_SURVEY_RESULTS";

/**
 * Maps template types to their human-readable names for the UI
 */
export const TEMPLATE_TYPE_LABELS: Record<CustomizableTemplateType, string> = {
  TICKET_CREATED: "Ticket Created",
  TICKET_UPDATED: "Ticket Updated",
  TICKET_ASSIGNMENT: "Ticket Assignment",
  NEW_COMMENTS: "New Comment",
  MARKET_CENTER_ASSIGNMENT: "Market Center Assignment",
  CATEGORY_ASSIGNMENT: "Category Assignment",
  TICKET_SURVEY: "Ticket Survey",
  TICKET_SURVEY_RESULTS: "Survey Results",
};

/**
 * Maps template types to their notification trigger names (for compatibility)
 */
export const TEMPLATE_TYPE_TO_TRIGGER: Record<CustomizableTemplateType, string> = {
  TICKET_CREATED: "Ticket Created",
  TICKET_UPDATED: "Ticket Updated",
  TICKET_ASSIGNMENT: "Ticket Assignment",
  NEW_COMMENTS: "New Comments",
  MARKET_CENTER_ASSIGNMENT: "Market Center Assignment",
  CATEGORY_ASSIGNMENT: "Category Assignment",
  TICKET_SURVEY: "Ticket Survey",
  TICKET_SURVEY_RESULTS: "Ticket Survey Results",
};

// =============================================================================
// VARIABLE DEFINITIONS - What data can be inserted into templates
// =============================================================================

export interface TemplateVariable {
  key: string; // The variable key, e.g., "ticket_title"
  label: string; // Human-readable name, e.g., "Ticket Title"
  description: string; // Help text, e.g., "The title of the ticket"
  example: string; // Example value for preview, e.g., "Login Issue"
}

/**
 * Available variables for each template type.
 * Used to populate the variable picker in the UI and for validation.
 */
export const TEMPLATE_VARIABLES: Record<CustomizableTemplateType, TemplateVariable[]> = {
  TICKET_CREATED: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "creator_name", label: "Creator Name", description: "Name of who created the ticket", example: "John Smith" },
    { key: "created_on", label: "Created Date", description: "When the ticket was created", example: "Dec 19, 2024" },
    { key: "due_date", label: "Due Date", description: "When the ticket is due", example: "Dec 26, 2024" },
    { key: "assignee_name", label: "Assignee Name", description: "Name of who the ticket is assigned to", example: "Jane Doe" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  TICKET_UPDATED: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "editor_name", label: "Editor Name", description: "Name of who made the update", example: "Jane Doe" },
    { key: "changed_details", label: "Changed Fields", description: "List of what was changed", example: "Status, Priority" },
    { key: "updated_on", label: "Updated Date", description: "When the ticket was updated", example: "Dec 19, 2024" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  TICKET_ASSIGNMENT: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "editor_name", label: "Assigned By", description: "Name of who changed the assignment", example: "Jane Doe" },
    { key: "current_assignment", label: "Current Assignee", description: "Who the ticket is now assigned to", example: "John Smith" },
    { key: "previous_assignment", label: "Previous Assignee", description: "Who the ticket was previously assigned to", example: "Jane Doe" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  NEW_COMMENTS: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "commenter_name", label: "Commenter Name", description: "Name of who left the comment", example: "Jane Doe" },
    { key: "comment", label: "Comment Text", description: "The comment content (preview only)", example: "I've looked into this issue..." },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  MARKET_CENTER_ASSIGNMENT: [
    { key: "market_center_name", label: "Market Center Name", description: "Name of the market center", example: "Austin Downtown" },
    { key: "editor_name", label: "Changed By", description: "Name of who made the change", example: "Jane Doe" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  CATEGORY_ASSIGNMENT: [
    { key: "category_name", label: "Category Name", description: "Name of the ticket category", example: "Technical Support" },
    { key: "category_description", label: "Category Description", description: "Description of the category", example: "Technical issues and bugs" },
    { key: "market_center_name", label: "Market Center Name", description: "Name of the market center", example: "Austin Downtown" },
    { key: "editor_name", label: "Changed By", description: "Name of who made the change", example: "Jane Doe" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  TICKET_SURVEY: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
  TICKET_SURVEY_RESULTS: [
    { key: "ticket_number", label: "Ticket Number", description: "The unique ticket identifier", example: "1234" },
    { key: "ticket_title", label: "Ticket Title", description: "The title of the ticket", example: "Login Issue" },
    { key: "staff_name", label: "Staff Name", description: "Name of the staff member who handled the ticket", example: "Jane Doe" },
    { key: "user_name", label: "Recipient Name", description: "Name of the person receiving this notification", example: "Alex Johnson" },
  ],
};

// =============================================================================
// EMAIL TEMPLATE VISIBLE FIELDS - What detail fields can be shown in emails
// =============================================================================

export interface EmailVisibleField {
  key: string; // Field identifier
  label: string; // Human-readable name for the toggle
  defaultVisible: boolean; // Whether it's shown by default
}

/**
 * Fields that can be toggled on/off in email detail sections.
 * Different template types have different available fields.
 */
export const EMAIL_VISIBLE_FIELDS: Record<CustomizableTemplateType, EmailVisibleField[]> = {
  TICKET_CREATED: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "creator_name", label: "Created By", defaultVisible: true },
    { key: "created_on", label: "Created Date", defaultVisible: true },
    { key: "due_date", label: "Due Date", defaultVisible: true },
    { key: "assignee_name", label: "Assigned To", defaultVisible: false },
  ],
  TICKET_UPDATED: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "editor_name", label: "Updated By", defaultVisible: true },
    { key: "updated_on", label: "Updated Date", defaultVisible: true },
    { key: "changed_details", label: "Changes Made", defaultVisible: true },
  ],
  TICKET_ASSIGNMENT: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "editor_name", label: "Assigned By", defaultVisible: true },
    { key: "current_assignment", label: "Now Assigned To", defaultVisible: true },
    { key: "previous_assignment", label: "Previously Assigned To", defaultVisible: false },
  ],
  NEW_COMMENTS: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "commenter_name", label: "Comment By", defaultVisible: true },
  ],
  MARKET_CENTER_ASSIGNMENT: [
    { key: "market_center_name", label: "Market Center", defaultVisible: true },
    { key: "editor_name", label: "Changed By", defaultVisible: true },
  ],
  CATEGORY_ASSIGNMENT: [
    { key: "category_name", label: "Category", defaultVisible: true },
    { key: "market_center_name", label: "Market Center", defaultVisible: true },
    { key: "editor_name", label: "Changed By", defaultVisible: true },
  ],
  TICKET_SURVEY: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
  ],
  TICKET_SURVEY_RESULTS: [
    { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "staff_name", label: "Handled By", defaultVisible: true },
  ],
};

// =============================================================================
// EMAIL TEMPLATE CUSTOMIZATION
// =============================================================================

export interface EmailTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;

  // Customizable content sections
  subject: string;
  greeting: string;
  mainMessage: string; // HTML from rich text editor
  buttonText: string | null; // null = hide button
  visibleFields: string[]; // Array of field keys to show

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreateEmailTemplateCustomizationInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export interface UpdateEmailTemplateCustomizationInput {
  subject?: string;
  greeting?: string;
  mainMessage?: string;
  buttonText?: string | null;
  visibleFields?: string[];
  isActive?: boolean;
}

// =============================================================================
// IN-APP TEMPLATE CUSTOMIZATION
// =============================================================================

export interface InAppTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;

  // Customizable content
  title: string;
  body: string;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreateInAppTemplateCustomizationInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  title: string;
  body: string;
}

export interface UpdateInAppTemplateCustomizationInput {
  title?: string;
  body?: string;
  isActive?: boolean;
}

// =============================================================================
// DEFAULT TEMPLATES - System defaults used when no customization exists
// =============================================================================

export interface DefaultEmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText: string;
  visibleFields: string[];
}

export interface DefaultInAppTemplate {
  title: string;
  body: string;
}

/**
 * Default email templates for all notification types.
 * Used when a market center hasn't customized a template.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<CustomizableTemplateType, DefaultEmailTemplate> = {
  TICKET_CREATED: {
    subject: "New Ticket: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "A new ticket has been created and needs your attention.",
    buttonText: "View Ticket",
    visibleFields: ["ticket_number", "creator_name", "created_on", "due_date"],
  },
  TICKET_UPDATED: {
    subject: "Ticket Updated: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "A ticket you're associated with has been updated.",
    buttonText: "View Ticket",
    visibleFields: ["ticket_number", "editor_name", "updated_on", "changed_details"],
  },
  TICKET_ASSIGNMENT: {
    subject: "Ticket Assignment: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "You have been assigned to a ticket.",
    buttonText: "View Ticket",
    visibleFields: ["ticket_number", "editor_name", "current_assignment"],
  },
  NEW_COMMENTS: {
    subject: "New Comment on {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "{{commenter_name}} left a new comment on a ticket you're following.",
    buttonText: "View Comment",
    visibleFields: ["ticket_number", "commenter_name"],
  },
  MARKET_CENTER_ASSIGNMENT: {
    subject: "Market Center Update",
    greeting: "Hi {{user_name}},",
    mainMessage: "Your market center assignment has been updated.",
    buttonText: "View Details",
    visibleFields: ["market_center_name", "editor_name"],
  },
  CATEGORY_ASSIGNMENT: {
    subject: "Category Assignment Update",
    greeting: "Hi {{user_name}},",
    mainMessage: "Your category assignment has been updated. You will now receive tickets in this category.",
    buttonText: "View Details",
    visibleFields: ["category_name", "market_center_name", "editor_name"],
  },
  TICKET_SURVEY: {
    subject: "How did we do? - {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "Your ticket has been resolved. We'd love to hear your feedback!",
    buttonText: "Take Survey",
    visibleFields: ["ticket_number", "ticket_title"],
  },
  TICKET_SURVEY_RESULTS: {
    subject: "Survey Results: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "New survey results are available for a ticket you handled.",
    buttonText: "View Results",
    visibleFields: ["ticket_number", "ticket_title", "staff_name"],
  },
};

/**
 * Default in-app notification templates for all notification types.
 * Used when a market center hasn't customized a template.
 */
export const DEFAULT_IN_APP_TEMPLATES: Record<CustomizableTemplateType, DefaultInAppTemplate> = {
  TICKET_CREATED: {
    title: "New Ticket: {{ticket_title}}",
    body: "{{creator_name}} created a new ticket",
  },
  TICKET_UPDATED: {
    title: "Ticket Updated: {{ticket_title}}",
    body: "{{editor_name}} updated: {{changed_details}}",
  },
  TICKET_ASSIGNMENT: {
    title: "Ticket Assigned: {{ticket_title}}",
    body: "You have been assigned to this ticket",
  },
  NEW_COMMENTS: {
    title: "New Comment: {{ticket_title}}",
    body: "{{commenter_name}}: {{comment}}",
  },
  MARKET_CENTER_ASSIGNMENT: {
    title: "Market Center Update",
    body: "{{editor_name}} updated your market center assignment",
  },
  CATEGORY_ASSIGNMENT: {
    title: "Category Assignment",
    body: "You are now assigned to {{category_name}}",
  },
  TICKET_SURVEY: {
    title: "Survey: {{ticket_title}}",
    body: "Please take a moment to provide feedback",
  },
  TICKET_SURVEY_RESULTS: {
    title: "Survey Results: {{ticket_title}}",
    body: "New feedback is available",
  },
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Template status for list views - shows whether using default or custom
 */
export interface TemplateStatus {
  templateType: CustomizableTemplateType;
  label: string;
  hasEmailCustomization: boolean;
  hasInAppCustomization: boolean;
  emailCustomization: EmailTemplateCustomization | null;
  inAppCustomization: InAppTemplateCustomization | null;
}

/**
 * Full template data with defaults for editing UI
 */
export interface TemplateWithDefaults {
  templateType: CustomizableTemplateType;
  label: string;
  variables: TemplateVariable[];

  // Email template
  emailDefault: DefaultEmailTemplate;
  emailCustomization: EmailTemplateCustomization | null;
  emailVisibleFieldOptions: EmailVisibleField[];

  // In-app template
  inAppDefault: DefaultInAppTemplate;
  inAppCustomization: InAppTemplateCustomization | null;
}
