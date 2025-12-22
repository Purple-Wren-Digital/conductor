import { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { createClerkClient } from "@clerk/backend";

const CLERK_SECRET_KEY = secret("CLERK_SECRET_KEY");

const clerkClient = createClerkClient({
  secretKey: CLERK_SECRET_KEY(),
});

function isClerkAPIError(error: any): error is {
  clerkError: true;
  status: number;
  errors?: { code?: string; message?: string; longMessage?: string }[];
} {
  return Boolean(error?.clerkError && Array.isArray(error?.errors));
}

function getClerkMessages(error: any): string[] {
  if (!error?.errors) return [];

  return error.errors
    .map((e: any) => e.longMessage || e.message)
    .filter(Boolean);
}

export const updateClerkUserName = async (
  clerkId: string,
  updateData: {
    firstName?: string;
    lastName?: string;
  }
) => {
  const user = await clerkClient.users.getUser(clerkId);
  if (!user) {
    throw new Error("Clerk user not found");
  }

  try {
    const updatedUser = await clerkClient.users.updateUser(clerkId, {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
    });
    return updatedUser;
  } catch (error: any) {
    console.error("Error updating Clerk user name:", error);

    if (isClerkAPIError(error)) {
      const messages = getClerkMessages(error);
      throw APIError.invalidArgument(messages.join(" "));
    }

    throw APIError.internal("Failed to update Clerk user name");
  }
};

export const updateClerkUserEmail = async (
  clerkId: string,
  newEmail: string
) => {
  try {
    const user = await clerkClient.users.getUser(clerkId);
    if (!user) {
      throw new Error("Clerk user not found");
    }

    const emailAddress = user.emailAddresses.find(
      (email: any) => email.emailAddress === newEmail
    );

    // If the email already exists, just set it as primary email
    // Otherwise, add the new email, then set it as primary email
    if (emailAddress) {
      await clerkClient.emailAddresses.updateEmailAddress(emailAddress.id, {
        verified: true,
        primary: true,
      });
    } else {
      const newEmailAddress =
        await clerkClient.emailAddresses.createEmailAddress({
          userId: clerkId,
          emailAddress: newEmail,
          primary: true,
          verified: true,
        });

      await clerkClient.users.updateUser(clerkId, {
        primaryEmailAddressID: newEmailAddress.id,
        notifyPrimaryEmailAddressChanged: true,
      });
    }
  } catch (error: any) {
    console.error("Error updating Clerk email:", error);

    if (isClerkAPIError(error)) {
      const messages = getClerkMessages(error);
      throw APIError.invalidArgument(messages.join(" "));
    }

    throw APIError.internal("Failed to update user email in Clerk");
  }
};
