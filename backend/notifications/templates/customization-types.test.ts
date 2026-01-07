import { describe, it, expect } from "vitest";

import {
  CustomizableTemplateType,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_TO_TRIGGER,
  TEMPLATE_VARIABLES,
  EMAIL_VISIBLE_FIELDS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
} from "./customization-types";

// =============================================================================
// TYPE DEFINITIONS TESTS
// =============================================================================

describe("CustomizableTemplateType", () => {
  const expectedTypes: CustomizableTemplateType[] = [
    "ticket_created",
    "ticket_updated",
    "ticket_assignment",
    "new_comments",
    "market_center_assignment",
    "category_assignment",
    "ticket_survey",
    "ticket_survey_results",
  ];

  it("should have exactly 8 template types", () => {
    expect(Object.keys(TEMPLATE_TYPE_LABELS)).toHaveLength(8);
  });

  it("should have all expected types in TEMPLATE_TYPE_LABELS", () => {
    expectedTypes.forEach((type) => {
      expect(TEMPLATE_TYPE_LABELS).toHaveProperty(type);
    });
  });
});

// =============================================================================
// TEMPLATE_TYPE_LABELS TESTS
// =============================================================================

describe("TEMPLATE_TYPE_LABELS", () => {
  it("should have human-readable labels for all types", () => {
    expect(TEMPLATE_TYPE_LABELS.ticket_created).toBe("Ticket Created");
    expect(TEMPLATE_TYPE_LABELS.ticket_updated).toBe("Ticket Updated");
    expect(TEMPLATE_TYPE_LABELS.ticket_assignment).toBe("Ticket Assignment");
    expect(TEMPLATE_TYPE_LABELS.new_comments).toBe("New Comment");
    expect(TEMPLATE_TYPE_LABELS.market_center_assignment).toBe(
      "Market Center Assignment"
    );
    expect(TEMPLATE_TYPE_LABELS.category_assignment).toBe(
      "Category Assignment"
    );
    expect(TEMPLATE_TYPE_LABELS.ticket_survey).toBe("Ticket Survey");
    expect(TEMPLATE_TYPE_LABELS.ticket_survey_results).toBe("Survey Results");
  });

  it("should not have empty labels", () => {
    Object.values(TEMPLATE_TYPE_LABELS).forEach((label) => {
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// TEMPLATE_TYPE_TO_TRIGGER TESTS
// =============================================================================

describe("TEMPLATE_TYPE_TO_TRIGGER", () => {
  it("should map to notification trigger names", () => {
    expect(TEMPLATE_TYPE_TO_TRIGGER.ticket_created).toBe("Ticket Created");
    expect(TEMPLATE_TYPE_TO_TRIGGER.ticket_updated).toBe("Ticket Updated");
    expect(TEMPLATE_TYPE_TO_TRIGGER.ticket_assignment).toBe(
      "Ticket Assignment"
    );
    expect(TEMPLATE_TYPE_TO_TRIGGER.new_comments).toBe("New Comments");
    expect(TEMPLATE_TYPE_TO_TRIGGER.market_center_assignment).toBe(
      "Market Center Assignment"
    );
    expect(TEMPLATE_TYPE_TO_TRIGGER.category_assignment).toBe(
      "Category Assignment"
    );
    expect(TEMPLATE_TYPE_TO_TRIGGER.ticket_survey).toBe("Ticket Survey");
    expect(TEMPLATE_TYPE_TO_TRIGGER.ticket_survey_results).toBe(
      "Ticket Survey Results"
    );
  });

  it("should have same keys as TEMPLATE_TYPE_LABELS", () => {
    const labelKeys = Object.keys(TEMPLATE_TYPE_LABELS).sort();
    const triggerKeys = Object.keys(TEMPLATE_TYPE_TO_TRIGGER).sort();
    expect(labelKeys).toEqual(triggerKeys);
  });
});

// =============================================================================
// TEMPLATE_VARIABLES TESTS
// =============================================================================

describe("TEMPLATE_VARIABLES", () => {
  it("should have variables for all template types", () => {
    Object.keys(TEMPLATE_TYPE_LABELS).forEach((type) => {
      expect(TEMPLATE_VARIABLES).toHaveProperty(type);
    });
  });

  describe("variable structure", () => {
    Object.entries(TEMPLATE_VARIABLES).forEach(([type, variables]) => {
      describe(`${type}`, () => {
        it("should be a non-empty array", () => {
          expect(Array.isArray(variables)).toBe(true);
          expect(variables.length).toBeGreaterThan(0);
        });

        variables.forEach((variable, index) => {
          it(`variable ${index} should have key`, () => {
            expect(variable.key).toBeDefined();
            expect(typeof variable.key).toBe("string");
            expect(variable.key.length).toBeGreaterThan(0);
          });

          it(`variable ${index} should have label`, () => {
            expect(variable.label).toBeDefined();
            expect(typeof variable.label).toBe("string");
          });

          it(`variable ${index} should have description`, () => {
            expect(variable.description).toBeDefined();
            expect(typeof variable.description).toBe("string");
          });

          it(`variable ${index} should have example`, () => {
            expect(variable.example).toBeDefined();
            expect(typeof variable.example).toBe("string");
          });

          it(`variable ${index} key should be snake_case`, () => {
            expect(variable.key).toMatch(/^[a-z_]+$/);
          });
        });

        it("should have unique keys", () => {
          const keys = variables.map((v) => v.key);
          const uniqueKeys = [...new Set(keys)];
          expect(keys.length).toBe(uniqueKeys.length);
        });
      });
    });
  });

  describe("common variables", () => {
    it("all ticket-related types should have ticket_title", () => {
      const ticketTypes = [
        "ticket_created",
        "ticket_updated",
        "ticket_assignment",
        "new_comments",
      ];
      ticketTypes.forEach((type) => {
        const vars =
          TEMPLATE_VARIABLES[type as keyof typeof TEMPLATE_VARIABLES];
        const hasTicketTitle = vars.some((v) => v.key === "ticket_title");
        expect(hasTicketTitle).toBe(true);
      });
    });

    it("all types except ticket_survey should have user_name for recipient", () => {
      Object.values(TEMPLATE_VARIABLES).forEach((vars) => {
        if (vars === TEMPLATE_VARIABLES.ticket_survey) return;
        const hasUserName = vars.some((v) => v.key === "user_name");
        expect(hasUserName).toBe(true);
      });
    });
  });
});

// =============================================================================
// EMAIL_VISIBLE_FIELDS TESTS
// =============================================================================

describe("EMAIL_VISIBLE_FIELDS", () => {
  it("should have fields for all template types", () => {
    Object.keys(TEMPLATE_TYPE_LABELS).forEach((type) => {
      expect(EMAIL_VISIBLE_FIELDS).toHaveProperty(type);
    });
  });

  describe("field structure", () => {
    Object.entries(EMAIL_VISIBLE_FIELDS).forEach(([type, fields]) => {
      describe(`${type}`, () => {
        it("should be a non-empty array", () => {
          expect(Array.isArray(fields)).toBe(true);
          expect(fields.length).toBeGreaterThan(0);
        });

        fields.forEach((field, index) => {
          it(`field ${index} should have key`, () => {
            expect(field.key).toBeDefined();
            expect(typeof field.key).toBe("string");
          });

          it(`field ${index} should have label`, () => {
            expect(field.label).toBeDefined();
            expect(typeof field.label).toBe("string");
          });

          it(`field ${index} should have defaultVisible boolean`, () => {
            expect(field.defaultVisible).toBeDefined();
            expect(typeof field.defaultVisible).toBe("boolean");
          });
        });

        it("field keys should match available variables", () => {
          const variableKeys = TEMPLATE_VARIABLES[
            type as keyof typeof TEMPLATE_VARIABLES
          ].map((v) => v.key);

          fields.forEach((field) => {
            expect(variableKeys).toContain(field.key);
          });
        });
      });
    });
  });
});

// =============================================================================
// DEFAULT_EMAIL_TEMPLATES TESTS
// =============================================================================

describe("DEFAULT_EMAIL_TEMPLATES", () => {
  it("should have defaults for all template types", () => {
    Object.keys(TEMPLATE_TYPE_LABELS).forEach((type) => {
      expect(DEFAULT_EMAIL_TEMPLATES).toHaveProperty(type);
    });
  });

  describe("template structure", () => {
    Object.entries(DEFAULT_EMAIL_TEMPLATES).forEach(([type, template]) => {
      describe(`${type}`, () => {
        it("should have subject", () => {
          expect(template.subject).toBeDefined();
          expect(typeof template.subject).toBe("string");
          expect(template.subject.length).toBeGreaterThan(0);
        });

        it("should have greeting", () => {
          expect(template.greeting).toBeDefined();
          expect(typeof template.greeting).toBe("string");
          expect(template.greeting.length).toBeGreaterThan(0);
        });

        it("should have mainMessage", () => {
          expect(template.mainMessage).toBeDefined();
          expect(typeof template.mainMessage).toBe("string");
          expect(template.mainMessage.length).toBeGreaterThan(0);
        });

        it("should have buttonText", () => {
          expect(template.buttonText).toBeDefined();
          expect(typeof template.buttonText).toBe("string");
          expect(template.buttonText.length).toBeGreaterThan(0);
        });

        it("should have visibleFields array", () => {
          expect(template.visibleFields).toBeDefined();
          expect(Array.isArray(template.visibleFields)).toBe(true);
          expect(template.visibleFields.length).toBeGreaterThan(0);
        });

        it("visibleFields should reference valid EMAIL_VISIBLE_FIELDS", () => {
          const validFieldKeys = EMAIL_VISIBLE_FIELDS[
            type as keyof typeof EMAIL_VISIBLE_FIELDS
          ].map((f) => f.key);

          template.visibleFields.forEach((fieldKey) => {
            expect(validFieldKeys).toContain(fieldKey);
          });
        });

        it("variables in content should be valid for this type", () => {
          const validKeys = TEMPLATE_VARIABLES[
            type as keyof typeof TEMPLATE_VARIABLES
          ].map((v) => v.key);

          const allContent = `${template.subject} ${template.greeting} ${template.mainMessage}`;
          const usedVars = allContent.match(/\{\{(\w+)\}\}/g) || [];

          usedVars.forEach((varMatch) => {
            const varKey = varMatch.replace(/\{\{|\}\}/g, "");
            expect(validKeys).toContain(varKey);
          });
        });
      });
    });
  });
});

// =============================================================================
// DEFAULT_IN_APP_TEMPLATES TESTS
// =============================================================================

describe("DEFAULT_IN_APP_TEMPLATES", () => {
  it("should have defaults for all template types", () => {
    Object.keys(TEMPLATE_TYPE_LABELS).forEach((type) => {
      expect(DEFAULT_IN_APP_TEMPLATES).toHaveProperty(type);
    });
  });

  describe("template structure", () => {
    Object.entries(DEFAULT_IN_APP_TEMPLATES).forEach(([type, template]) => {
      describe(`${type}`, () => {
        it("should have title", () => {
          expect(template.title).toBeDefined();
          expect(typeof template.title).toBe("string");
          expect(template.title.length).toBeGreaterThan(0);
        });

        it("should have body", () => {
          expect(template.body).toBeDefined();
          expect(typeof template.body).toBe("string");
          expect(template.body.length).toBeGreaterThan(0);
        });

        it("variables in content should be valid for this type", () => {
          const validKeys = TEMPLATE_VARIABLES[
            type as keyof typeof TEMPLATE_VARIABLES
          ].map((v) => v.key);

          const allContent = `${template.title} ${template.body}`;
          const usedVars = allContent.match(/\{\{(\w+)\}\}/g) || [];

          usedVars.forEach((varMatch) => {
            const varKey = varMatch.replace(/\{\{|\}\}/g, "");
            expect(validKeys).toContain(varKey);
          });
        });

        it("should be concise (suitable for in-app display)", () => {
          // In-app notifications should be short
          expect(template.title.length).toBeLessThan(100);
          expect(template.body.length).toBeLessThan(200);
        });
      });
    });
  });
});

// =============================================================================
// CONSISTENCY TESTS
// =============================================================================

describe("Cross-configuration consistency", () => {
  const templateTypes = Object.keys(TEMPLATE_TYPE_LABELS);

  it("all configurations should have same template types", () => {
    expect(Object.keys(TEMPLATE_TYPE_TO_TRIGGER).sort()).toEqual(
      templateTypes.sort()
    );
    expect(Object.keys(TEMPLATE_VARIABLES).sort()).toEqual(
      templateTypes.sort()
    );
    expect(Object.keys(EMAIL_VISIBLE_FIELDS).sort()).toEqual(
      templateTypes.sort()
    );
    expect(Object.keys(DEFAULT_EMAIL_TEMPLATES).sort()).toEqual(
      templateTypes.sort()
    );
    expect(Object.keys(DEFAULT_IN_APP_TEMPLATES).sort()).toEqual(
      templateTypes.sort()
    );
  });

  it("default visible fields should match visible field options", () => {
    Object.entries(DEFAULT_EMAIL_TEMPLATES).forEach(([type, template]) => {
      const availableFields = EMAIL_VISIBLE_FIELDS[
        type as keyof typeof EMAIL_VISIBLE_FIELDS
      ].map((f) => f.key);

      template.visibleFields.forEach((field) => {
        expect(availableFields).toContain(field);
      });
    });
  });

  it("default visible fields should match the defaultVisible settings", () => {
    Object.entries(DEFAULT_EMAIL_TEMPLATES).forEach(([type, template]) => {
      const fieldOptions =
        EMAIL_VISIBLE_FIELDS[type as keyof typeof EMAIL_VISIBLE_FIELDS];
      const defaultVisibleKeys = fieldOptions
        .filter((f) => f.defaultVisible)
        .map((f) => f.key);

      // The default template's visible fields should at least include the defaultVisible ones
      defaultVisibleKeys.forEach((key) => {
        expect(template.visibleFields).toContain(key);
      });
    });
  });
});
