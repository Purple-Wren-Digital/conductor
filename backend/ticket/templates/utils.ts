import { TicketTemplate } from "./types";

// Hardcoded templates for now - could be moved to database later
export const TICKET_TEMPLATES: Partial<TicketTemplate>[] = [
  {
    id: "Appraisal_Template",
    name: "Appraisal",
    description: "Template for managing property appraisals",
    title: "Appraisal - [Property Address]",
    ticketDescription: `<p>Appraisal needed for property at [Address]</p>
      <p>Appraisal type:</p>
      <ul>
        <li>Full appraisal</li>
        <li>Drive-by appraisal</li>
        <li>Desktop appraisal</li>
      </ul>
      <p>Preferred dates/times:</p>
      <ul>
        <li>mm/dd/yyyy; hh:mm</li>
      </ul>
      <p>Contact person:</p>
      <ul>
        <li>Name: </li>
        <li>Phone: </li>
        <li>Email:</li>
      </ul>
      `,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Contact appraisal vendor",
      "Confirm vendor requirements",
      "Schedule appraisal date/time",
      "Notify property owner/tenant",
      "Confirm pets are secured",
      "Arrange for access to property",
      "Confirm appraisal appointment",
      "Follow up post-appraisal",
    ],
  },
  {
    id: "Client_Complaint_Template",
    name: "Client Complaint",
    description: "Template for handling client complaints",
    title: "Client Complaint - [Client Name]",
    ticketDescription: `<p>Client Information:</p>
      <ul>
        <li>Name:</li>
        <li>Phone:</li>
        <li>Email:</li>
      </ul>
      <p>Complaint details:</p>
      <ul>
        <li>Details of the complaint</li>
      </ul>
      <p>Preferred resolution:</p>
      <p>Additional notes:</p>`,
    urgency: "HIGH",
    isActive: true,
    todos: [
      "Review complaint details",
      "Contact client for more information",
      "Investigate the issue",
      "Propose a resolution",
      "Follow up with client",
      "Document the complaint and resolution",
    ],
  },
  {
    id: "Contract_Issue_Template",
    name: "Contract Issue",
    description: "Template for urgent contract-related issues",
    title: "URGENT: Contract Issue - [Property/Client]",
    ticketDescription: `<p>Property/Client Information</p>
      <ul>
        <li>Name: </li>
        <li>Phone: </li>
        <li>Email:</li>
      </ul>
      <p>Issue type:</p>
      <ul>
        <li>Missing signatures</li>
        <li>Incorrect terms</li>
        <li>Deadline approaching</li>
        <li>Other: </li>
      </ul>
      <p>Details:</p>
      <p>Deadline: </p>
      <p>Action needed:</p>`,
    urgency: "HIGH",
    isActive: true,
    todos: [
      "Identify contract issue",
      "Contact relevant parties",
      "Draft necessary amendments",
      "Obtain required signatures",
      "Confirm resolution of issue",
    ],
  },
  {
    id: "Document_Request_Template",
    name: "Document Request",
    description: "Template for document requests",
    title: "Document Request - [Document Type]",
    ticketDescription: `<p>Requester Information:</p>
      <ul>
        <li>Name:</li>
        <li>Phone:</li>
        <li>Email:</li>
      </ul>
      <p>[Request Date: mm/dd/yyyy]</p>
      <p>[Address, City, State, ZIP]</p>
      <p>Documents needed:</p>
      <ol>
        <li>Purchase agreement</li>
        <li>Disclosure forms</li>
        <li>Inspection reports</li>
        <li>Title documents</li>
        <li>Other: </li>
      </ol>
      <p>Required by: </p>
      <p>Purpose: </p>
      <p>Delivery method:</p>
      <ul>
        <li>Email</li>
        <li>Physical copy</li>
        <li>Upload to portal</li>
      </ul>`,
    urgency: "LOW",
    isActive: true,
    todos: [
      "Identify documents needed",
      "Contact requester for clarification",
      "Gather documents",
      "Deliver documents as requested",
      "Confirm receipt with requester",
    ],
  },
  {
    id: "Inspection_Scheduling_Template",
    name: "Inspection Scheduling",
    description: "Template for scheduling property inspections",
    title: "Schedule Inspection - [Property Address]",
    ticketDescription: `<p>[Address, City, State, ZIP]</p>
       <p>Inspection type:</p>
       <ul>
         <li>Home inspection</li>
         <li>Pest inspection</li>
         <li>Appraisal</li>
         <li>Other: </li>
       </ul>
       <p>Preferred dates/times:</p>
       <ul>
         <li>mm/dd/yyyy; hh:mm</li>
       </ul>
       <p>Contact person:</p>
       <ul>
         <li>Name: </li>
         <li>Phone: </li>
         <li>Email:</li>
       </ul>
       <p>Additional notes:</p>`,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Contact inspection company",
      "Schedule inspection date/time",
      "Notify property owner/tenant",
      "Arrange for access to property",
      "Confirm inspection appointment",
      "Follow up post-inspection",
    ],
  },
  {
    id: "Maintenance_Request_Template",
    name: "Maintenance Request",
    description: "Template for property maintenance requests",
    title: "Maintenance Request - [Property Address]",
    ticketDescription: `<p>Property:[Address, City, State, ZIP]</p>
    <Property type: </p>

    <p>Tenant/Owner Info:</p>
    <ul>
      <li>Name:</li>
      <li>Phone: </li>
      <li>Email:</li>
    </ul>
    <p>Issue:</p>
    <ul>
      <li>Emergency (immediate)</li>
      <li>Urgent (24-48 hours)</li>
      <li>Routine (within a week)</li>
    </ul>
    <p>Access instructions:</p>
    <p>Preferred service window:</p>
    <ul>
      <li>mm/dd/yyyy; hh:mm</li>
    </ul>
    <p>Additional notes:</p>`,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Identify maintenance issue",
      "File maintenance report",
      "Contact approved vendor",
      "Schedule maintenance appointment",
      "Confirm appointment with property owner/tenant",
      "Confirm pets are secured",
      "Follow up with vendor",
      "Follow up with property owner/tenant",
      "Confirm work completed",
      "Close maintenance request",
    ],
  },
  {
    id: "Employee_Onboarding_Template",
    name: "Employee Onboarding",
    description: "Template for onboarding new employees",
    title: "Employee Onboarding  - [Employee Name]",
    ticketDescription: `
      <ul>
        <li>Start Date: </li>
        <li>Employee Name: </li>
        <li>Contact Information:</li>
        <ul>
          <li>Phone:</li>
          <li>Email:</li>
        </ul>
        <li>Market Center:</li>
        <li>Department:</li>
        <li>Position: </li>
        <li>License Number:</li>
      </ul>
      `,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Admin: Create Conductor account",
      "Set up workstation",
      "Set up company email and software access",
      "Schedule orientation sessions",
      "Schedule training sessions",
      "Complete training modules",
      "Complete HR paperwork: taxes, direct deposit, benefits, etc.",
      "Review company policies, culture, and values",
      "Review team structure and key contacts",
      "Review job-specific tools and software",
      "Review role-specific procedures, responsibilities, expectations, etc.",
    ],
  },
  {
    id: "New_Listing_Template",
    name: "New Listing",
    description: "Template for setting up a new property listing",
    title: "Setup New Listing - [Property Address]",
    ticketDescription: `
      <p>Target go-live date:</p>
      <p>Property details:</p>
      <ul>
        <li>[Address, City, State, ZIP]</li>
        <li>Price: $</li>
        <li>Bedrooms: </li>
        <li>Bathrooms: </li>
        <li>Square feet: </li>
      </ul>
      `,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Gather property details",
      "Schedule photography",
      "Create MLS listing",
      "Plan open house events",
      "Request marketing materials",
      "Install signage",
    ],
  },
  {
    id: "Showing_Request_Template",
    name: "Showing Request",
    description: "Template for scheduling property showings",
    title: "Property Showing Request - [Property Address]",
    ticketDescription: `<p>[Address, City, State, ZIP]</p>
    <p>Preferred dates/times:</p>
      <ul>
        <li>mm/dd/yyyy; hh:mm</li>
      </ul>
      <p>Client contact:</p>
      <ul>
        <li>Name:</li>
        <li>Phone:</li>
        <li>Email:</li>
      </ul>
      <p>Access Instructions:</p>`,
    urgency: "MEDIUM",
    isActive: true,
    todos: [
      "Confirm date/time with client",
      "Schedule reminders",
      "Notify seller's/buyer's agent",
      "Notify tenants/property owner",
      "Arrange for lockbox/key access",
      "Arrange for pets to be secured",
      "Clean/Stage property if needed",
      "Follow up post-showing",
    ],
  },
  {
    id: "Vendor_Onboarding_Template",
    name: "Vendor Onboarding",
    description: "Template for onboarding new vendors",
    title: "Vendor Onboarding - [Vendor Name]",
    ticketDescription: `<p>[Vendor Name]</p>
    <p>Services provided:</p>
    <p>Contact person:</p>
    <ul>
      <li>Name: </li>
      <li>Phone: </li>
      <li>Email:</li>
    </ul>
    <p>Required documentation:</p>
    <ul>
      <li>[ ] W-9 form</li>
      <li>[ ] Insurance certificates</li>
      <li>[ ] Service agreements</li>
    </ul>`,
    urgency: "LOW",
    isActive: true,
    todos: [
      "Collect vendor information",
      "Obtain required documentation",
      "Set up vendor in payment system",
      "Review service agreements",
      "Schedule introductory meeting",
    ],
  },
];
