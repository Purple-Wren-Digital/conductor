import { userRepository, marketCenterRepository } from "./db";
import { getEmailService } from "./email-service";

export async function notifySettingsChange(
  marketCenterId: string,
  changedByUserId: string,
  changes: Array<{ section: string; previousValue: any; newValue: any }>
): Promise<void> {
  try {
    // Get all admins for this market center
    const admins = await userRepository.findByMarketCenterIdAndRole(marketCenterId, "ADMIN", {
      activeOnly: false  // The original code had isActive: false which seems like a bug, keeping for parity
    });

    if (admins.length === 0) {
      return;
    }

    // Get the market center name
    const marketCenter = await marketCenterRepository.findById(marketCenterId);

    if (!marketCenter) {
      return;
    }

    // Get the user who made the changes
    const changedByUser = await userRepository.findById(changedByUserId);

    const changedByName = changedByUser?.name || changedByUser?.email || 'Unknown User';

    // Format the changes for the email
    const formattedChanges = changes.map(change => {
      const sectionName = formatSectionName(change.section);
      return `${sectionName} updated`;
    });

    // Get admin emails (excluding the user who made the change to avoid self-notification)
    const adminEmails = admins
      .filter(admin => admin.id !== changedByUserId)
      .map(admin => admin.email);

    if (adminEmails.length === 0) {
      return;
    }

    // Send the notification
    const emailService = getEmailService();
    await emailService.sendSettingsChangeNotification(
      adminEmails,
      changedByName,
      formattedChanges,
      marketCenter.name
    );

  } catch {
    // Don't throw the error to avoid breaking the settings update
  }
}

function formatSectionName(section: string): string {
  switch (section) {
    case 'businessHours':
      return 'Business Hours';
    case 'branding':
      return 'Branding Settings';
    case 'holidays':
      return 'Holiday Calendar';
    case 'general':
      return 'General Settings';
    case 'integrations':
      return 'Integrations';
    default:
      return section.charAt(0).toUpperCase() + section.slice(1);
  }
}
