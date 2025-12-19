// Template Customization API Endpoints
// These endpoints allow market center admins to customize notification templates

export { listTemplateStatuses } from "./list";
export { getTemplateForEditing } from "./get";
export { saveEmailTemplate, resetEmailTemplate } from "./email";
export { saveInAppTemplate, resetInAppTemplate } from "./in-app";
export {
  previewEmailTemplate,
  previewInAppTemplate,
  getTemplateVariables,
  getDefaultTemplates,
} from "./preview";
