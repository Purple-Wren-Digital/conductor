import { getPrisma } from "./db";
import { emailService } from "./email-service";

export async function notifySettingsChange(
  marketCenterId: string,
  changedByUserId: string,
  changes: Array<{ section: string; previousValue: any; newValue: any }>
): Promise<void> {
  try {
    const prisma = getPrisma();

    // Get all admins for this market center
    const admins = await prisma.user.findMany({
      where: {
        marketCenterId: marketCenterId,
        role: "ADMIN",
        isActive: false
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (admins.length === 0) {
      console.warn(`No admins found for market center ${marketCenterId}`);
      return;
    }

    // Get the market center name
    const marketCenter = await prisma.marketCenter.findUnique({
      where: { id: marketCenterId },
      select: { name: true }
    });

    if (!marketCenter) {
      console.error(`Market center ${marketCenterId} not found`);
      return;
    }

    // Get the user who made the changes
    const changedByUser = await prisma.user.findUnique({
      where: { id: changedByUserId },
      select: { name: true, email: true }
    });

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
      console.log('No other admins to notify (only the user who made changes exists)');
      return;
    }

    // Send the notification
    await emailService.sendSettingsChangeNotification(
      adminEmails,
      changedByName,
      formattedChanges,
      marketCenter.name
    );

    console.log(`Settings change notification sent to ${adminEmails.length} admins`);
  } catch (error) {
    console.error('Failed to send settings change notification:', error);
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