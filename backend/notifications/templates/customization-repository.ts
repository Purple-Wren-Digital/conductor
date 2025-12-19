import { db, fromTimestamp, fromJson, toJson, generateId } from "../../ticket/db";
import {
  CustomizableTemplateType,
  EmailTemplateCustomization,
  InAppTemplateCustomization,
  CreateEmailTemplateCustomizationInput,
  UpdateEmailTemplateCustomizationInput,
  CreateInAppTemplateCustomizationInput,
  UpdateInAppTemplateCustomizationInput,
} from "./customization-types";

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

interface EmailTemplateCustomizationRow {
  id: string;
  market_center_id: string;
  template_type: string;
  subject: string;
  greeting: string;
  main_message: string;
  button_text: string | null;
  visible_fields: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by_id: string | null;
  updated_by_id: string | null;
}

interface InAppTemplateCustomizationRow {
  id: string;
  market_center_id: string;
  template_type: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by_id: string | null;
  updated_by_id: string | null;
}

// =============================================================================
// ROW TO MODEL MAPPERS
// =============================================================================

function mapEmailRow(row: EmailTemplateCustomizationRow): EmailTemplateCustomization {
  return {
    id: row.id,
    marketCenterId: row.market_center_id,
    templateType: row.template_type as CustomizableTemplateType,
    subject: row.subject,
    greeting: row.greeting,
    mainMessage: row.main_message,
    buttonText: row.button_text,
    visibleFields: fromJson(row.visible_fields) ?? [],
    isActive: row.is_active,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
    createdById: row.created_by_id,
    updatedById: row.updated_by_id,
  };
}

function mapInAppRow(row: InAppTemplateCustomizationRow): InAppTemplateCustomization {
  return {
    id: row.id,
    marketCenterId: row.market_center_id,
    templateType: row.template_type as CustomizableTemplateType,
    title: row.title,
    body: row.body,
    isActive: row.is_active,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
    createdById: row.created_by_id,
    updatedById: row.updated_by_id,
  };
}

// =============================================================================
// EMAIL TEMPLATE CUSTOMIZATION REPOSITORY
// =============================================================================

export const emailTemplateCustomizationRepository = {
  /**
   * Get a specific email template customization by market center and type
   */
  async findByMarketCenterAndType(
    marketCenterId: string,
    templateType: CustomizableTemplateType
  ): Promise<EmailTemplateCustomization | null> {
    const row = await db.queryRow<EmailTemplateCustomizationRow>`
      SELECT * FROM email_template_customizations
      WHERE market_center_id = ${marketCenterId}
        AND template_type = ${templateType}
        AND is_active = true
    `;
    return row ? mapEmailRow(row) : null;
  },

  /**
   * Get all email template customizations for a market center
   */
  async findAllByMarketCenter(marketCenterId: string): Promise<EmailTemplateCustomization[]> {
    const rows = await db.queryAll<EmailTemplateCustomizationRow>`
      SELECT * FROM email_template_customizations
      WHERE market_center_id = ${marketCenterId}
      ORDER BY template_type ASC
    `;
    return rows.map(mapEmailRow);
  },

  /**
   * Get a specific email template customization by ID
   */
  async findById(id: string): Promise<EmailTemplateCustomization | null> {
    const row = await db.queryRow<EmailTemplateCustomizationRow>`
      SELECT * FROM email_template_customizations
      WHERE id = ${id}
    `;
    return row ? mapEmailRow(row) : null;
  },

  /**
   * Create a new email template customization
   */
  async create(
    input: CreateEmailTemplateCustomizationInput,
    userId: string
  ): Promise<EmailTemplateCustomization> {
    const id = await generateId();
    const visibleFieldsJson = toJson(input.visibleFields);

    const row = await db.queryRow<EmailTemplateCustomizationRow>`
      INSERT INTO email_template_customizations (
        id, market_center_id, template_type, subject, greeting,
        main_message, button_text, visible_fields, created_by_id, updated_by_id
      )
      VALUES (
        ${id}, ${input.marketCenterId}, ${input.templateType}, ${input.subject},
        ${input.greeting}, ${input.mainMessage}, ${input.buttonText ?? null},
        ${visibleFieldsJson}, ${userId}, ${userId}
      )
      RETURNING *
    `;

    return mapEmailRow(row!);
  },

  /**
   * Update an email template customization
   */
  async update(
    id: string,
    input: UpdateEmailTemplateCustomizationInput,
    userId: string
  ): Promise<EmailTemplateCustomization | null> {
    // Build dynamic update - only update provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(input.subject);
    }
    if (input.greeting !== undefined) {
      updates.push(`greeting = $${paramIndex++}`);
      values.push(input.greeting);
    }
    if (input.mainMessage !== undefined) {
      updates.push(`main_message = $${paramIndex++}`);
      values.push(input.mainMessage);
    }
    if (input.buttonText !== undefined) {
      updates.push(`button_text = $${paramIndex++}`);
      values.push(input.buttonText);
    }
    if (input.visibleFields !== undefined) {
      updates.push(`visible_fields = $${paramIndex++}`);
      values.push(toJson(input.visibleFields));
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by_id = $${paramIndex++}`);
    values.push(userId);

    // Add the id for the WHERE clause
    values.push(id);

    const row = await db.queryRow<EmailTemplateCustomizationRow>`
      UPDATE email_template_customizations
      SET subject = COALESCE(${input.subject}, subject),
          greeting = COALESCE(${input.greeting}, greeting),
          main_message = COALESCE(${input.mainMessage}, main_message),
          button_text = ${input.buttonText !== undefined ? input.buttonText : null},
          visible_fields = COALESCE(${input.visibleFields ? toJson(input.visibleFields) : null}, visible_fields),
          is_active = COALESCE(${input.isActive}, is_active),
          updated_at = NOW(),
          updated_by_id = ${userId}
      WHERE id = ${id}
      RETURNING *
    `;

    return row ? mapEmailRow(row) : null;
  },

  /**
   * Delete an email template customization (reverts to default)
   */
  async delete(id: string): Promise<boolean> {
    await db.exec`
      DELETE FROM email_template_customizations
      WHERE id = ${id}
    `;
    return true;
  },

  /**
   * Delete all email template customizations for a market center and type (reset to default)
   */
  async deleteByMarketCenterAndType(
    marketCenterId: string,
    templateType: CustomizableTemplateType
  ): Promise<boolean> {
    await db.exec`
      DELETE FROM email_template_customizations
      WHERE market_center_id = ${marketCenterId}
        AND template_type = ${templateType}
    `;
    return true;
  },
};

// =============================================================================
// IN-APP TEMPLATE CUSTOMIZATION REPOSITORY
// =============================================================================

export const inAppTemplateCustomizationRepository = {
  /**
   * Get a specific in-app template customization by market center and type
   */
  async findByMarketCenterAndType(
    marketCenterId: string,
    templateType: CustomizableTemplateType
  ): Promise<InAppTemplateCustomization | null> {
    const row = await db.queryRow<InAppTemplateCustomizationRow>`
      SELECT * FROM in_app_template_customizations
      WHERE market_center_id = ${marketCenterId}
        AND template_type = ${templateType}
        AND is_active = true
    `;
    return row ? mapInAppRow(row) : null;
  },

  /**
   * Get all in-app template customizations for a market center
   */
  async findAllByMarketCenter(marketCenterId: string): Promise<InAppTemplateCustomization[]> {
    const rows = await db.queryAll<InAppTemplateCustomizationRow>`
      SELECT * FROM in_app_template_customizations
      WHERE market_center_id = ${marketCenterId}
      ORDER BY template_type ASC
    `;
    return rows.map(mapInAppRow);
  },

  /**
   * Get a specific in-app template customization by ID
   */
  async findById(id: string): Promise<InAppTemplateCustomization | null> {
    const row = await db.queryRow<InAppTemplateCustomizationRow>`
      SELECT * FROM in_app_template_customizations
      WHERE id = ${id}
    `;
    return row ? mapInAppRow(row) : null;
  },

  /**
   * Create a new in-app template customization
   */
  async create(
    input: CreateInAppTemplateCustomizationInput,
    userId: string
  ): Promise<InAppTemplateCustomization> {
    const id = await generateId();

    const row = await db.queryRow<InAppTemplateCustomizationRow>`
      INSERT INTO in_app_template_customizations (
        id, market_center_id, template_type, title, body, created_by_id, updated_by_id
      )
      VALUES (
        ${id}, ${input.marketCenterId}, ${input.templateType},
        ${input.title}, ${input.body}, ${userId}, ${userId}
      )
      RETURNING *
    `;

    return mapInAppRow(row!);
  },

  /**
   * Update an in-app template customization
   */
  async update(
    id: string,
    input: UpdateInAppTemplateCustomizationInput,
    userId: string
  ): Promise<InAppTemplateCustomization | null> {
    const row = await db.queryRow<InAppTemplateCustomizationRow>`
      UPDATE in_app_template_customizations
      SET title = COALESCE(${input.title}, title),
          body = COALESCE(${input.body}, body),
          is_active = COALESCE(${input.isActive}, is_active),
          updated_at = NOW(),
          updated_by_id = ${userId}
      WHERE id = ${id}
      RETURNING *
    `;

    return row ? mapInAppRow(row) : null;
  },

  /**
   * Delete an in-app template customization (reverts to default)
   */
  async delete(id: string): Promise<boolean> {
    await db.exec`
      DELETE FROM in_app_template_customizations
      WHERE id = ${id}
    `;
    return true;
  },

  /**
   * Delete all in-app template customizations for a market center and type (reset to default)
   */
  async deleteByMarketCenterAndType(
    marketCenterId: string,
    templateType: CustomizableTemplateType
  ): Promise<boolean> {
    await db.exec`
      DELETE FROM in_app_template_customizations
      WHERE market_center_id = ${marketCenterId}
        AND template_type = ${templateType}
    `;
    return true;
  },
};
