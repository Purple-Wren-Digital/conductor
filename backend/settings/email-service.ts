import { Resend } from 'resend';
import { secret } from 'encore.dev/config';

const RESEND_API_KEY = secret('RESEND_API_KEY');
const EMAIL_FROM_ADDRESS = 'noreply@conductor.app'; // Can be made configurable via Encore config if needed
const EMAIL_FROM_NAME = 'Conductor'; // Can be made configurable via Encore config if needed

interface EmailConfig {
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

class EmailService {
  private resend: Resend;
  private fromAddress: string;
  private fromName: string;

  constructor(config: EmailConfig) {
    this.resend = new Resend(config.apiKey);
    this.fromAddress = config.fromAddress;
    this.fromName = config.fromName;
  }

  async sendEmail(to: string[], subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendSettingsChangeNotification(
    to: string[],
    changedBy: string,
    changes: string[],
    marketCenterName: string
  ): Promise<void> {
    const subject = `Settings Updated - ${marketCenterName}`;
    const html = this.generateSettingsChangeTemplate(changedBy, changes, marketCenterName);
    
    await this.sendEmail(to, subject, html);
  }

  private generateSettingsChangeTemplate(
    changedBy: string,
    changes: string[],
    marketCenterName: string
  ): string {
    const changesList = changes.map(change => `<li style="margin: 8px 0;">${change}</li>`).join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Settings Updated</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Settings Updated</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280;">Market Center: <strong>${marketCenterName}</strong></p>
          </div>
          
          <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="margin-top: 0;">Hello,</p>
            
            <p>The settings for <strong>${marketCenterName}</strong> have been updated by <strong>${changedBy}</strong>.</p>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #374151; margin-bottom: 10px;">Changes made:</h3>
              <ul style="padding-left: 20px; margin: 0;">
                ${changesList}
              </ul>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Note:</strong> This notification was sent to all administrators of ${marketCenterName}.
                If you have any questions about these changes, please contact the person who made the update.
              </p>
            </div>
            
            <p style="margin-bottom: 0;">
              Best regards,<br>
              <strong>Conductor System</strong>
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;
  }
}

// Lazy initialization - only create when needed
let emailService: EmailService | null = null;

function getEmailService(): EmailService {
  if (!emailService) {
    const apiKey = RESEND_API_KEY();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY secret not configured");
    }
    emailService = new EmailService({
      apiKey,
      fromAddress: EMAIL_FROM_ADDRESS,
      fromName: EMAIL_FROM_NAME,
    });
  }
  return emailService;
}

export { getEmailService };