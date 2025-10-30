import { UserRole } from "@/lib/types";

export interface PublicMetaData {
  role: UserRole;
  marketCenterId: string | null;
  invited: boolean;
  invitedOn: Date | null;
  accepted: boolean;
  acceptedOn: Date | null;
}

export interface ClerkCreateUser {
  // https://clerk.com/docs/reference/backend-api/tag/users/post/users
  email_address: string[];
  external_id: null;
  first_name: string | null;
  last_name: string | null;
  password: string | null; // plain text
  password_digest: null;
  password_hasher: "";
  phone_number: [""];
  skip_password_checks: boolean | null;
  skip_password_requirement: boolean | null;
  username: null;
  web3_wallet: [""];
  backup_codes: [""];
  create_organization_enabled: null;
  create_organizations_limit: null;
  totp_secret: null;
  public_metadata?: PublicMetaData;
  private_metadata?: {};
  unsafe_metadata?: {};
  delete_self_enabled: null;
  legal_accepted_at: null;
  skip_legal_checks: null;
  created_at: null;
}

// https://clerk.com/docs/reference/backend-api/model/user
export interface ClerkUser {
  id: string;
  object: "user" | string;
  external_id: string | null;

  username: string | null;
  first_name: string | null;
  last_name: string | null;
  locale: string | null;
  image_url: string;
  has_image: boolean;
  public_metadata?: PublicMetaData;
  private_metadata: object | null; // only visible on backend
  unsafe_metadata: object;
  //   primary_email_address_id: string | null;
  //   primary_phone_number_id: string | null;
  //   primary_web3_wallet_id: string | null;
  email_addresses: [
    {
      id: string;
      object: string; // "email_address";
      email_address: string;
      reserved: boolean; //true;
      verification: {
        object: string; // "verification_otp";
        status: "verified" | "unverified";
        strategy: string; //  "phone_code" | "admin";
        attempts: any | null;
        expire_at: any | null;
        verified_at_client: any | null;
      };
      linked_to: [
        {
          type: string;
          id: string;
        },
      ];
      matches_sso_connection: boolean; // true;
      created_at: Date | string | number;
      updated_at: Date | string | number;
    },
  ];
  phone_numbers: [
    {
      id: string;
      object: string;
      phone_number: string;
      reserved_for_second_factor: boolean; // true;
      default_second_factor: boolean; // true;
      reserved: boolean; // true;
      verification: {
        object: string; // "verification_otp";
        status: "verified" | "unverified";
        strategy: string; //  "phone_code" | "admin";
        attempts: any | null;
        expire_at: any | null;
        verified_at_client: any | null;
      };
      linked_to: [
        {
          type: string;
          id: string;
        },
      ];
      backup_codes: string[];
      created_at: Date | string | number;
      updated_at: Date | string | number;
    },
  ];
  web3_wallets: [
    {
      id: "string";
      object: "web3_wallet";
      web3_wallet: "string";
      verification: {
        object: "verification_web3";
        status: "unverified";
        strategy: "web3_metamask_signature";
        nonce: null;
        message: null;
        attempts: null;
        expire_at: null;
        verified_at_client: null;
      };
      created_at: 1;
      updated_at: 1;
    },
  ];
  passkeys: [
    {
      id: "string";
      object: "passkey";
      name: "string";
      last_used_at: 1;
      verification: {
        object: "verification_passkey";
        status: "verified";
        strategy: "passkey";
        nonce: "nonce";
        message: null;
        attempts: null;
        expire_at: null;
        verified_at_client: null;
      };
    },
  ];
  password_enabled: boolean;
  two_factor_enabled: boolean;
  totp_enabled: boolean;
  backup_code_enabled: boolean;
  mfa_enabled_at: number | null;
  mfa_disabled_at: number | null;
  external_accounts: any;
  //   [
  //     {
  //       object: "external_account";
  //       id: "string";
  //       provider: "string";
  //       identification_id: "string";
  //       provider_user_id: "string";
  //       approved_scopes: "string";
  //       email_address: "string";
  //       first_name: "string";
  //       last_name: "string";
  //       image_url: null;
  //       username: null;
  //       phone_number: null;
  //       public_metadata: {
  //         "propertyName*": "anything";
  //       };
  //       label: null;
  //       created_at: 1;
  //       updated_at: 1;
  //       verification: {
  //         object: "verification_oauth";
  //         status: "unverified";
  //         strategy: "string";
  //         external_verification_redirect_url: "string";
  //         error: {
  //           message: "string";
  //           long_message: "string";
  //           code: "string";
  //           meta: {};
  //         };
  //         expire_at: 1;
  //         attempts: null;
  //         verified_at_client: null;
  //       };
  //       "propertyName*": "anything";
  //     },
  //   ];
  saml_accounts: any;
  //   [
  //     {
  //       id: "string";
  //       object: "saml_account";
  //       provider: "string";
  //       active: true;
  //       email_address: "string";
  //       first_name: null;
  //       last_name: null;
  //       provider_user_id: null;
  //       last_authenticated_at: null;
  //       public_metadata: {
  //         "propertyName*": "anything";
  //       };
  //       verification: {
  //         object: "verification_saml";
  //         status: "unverified";
  //         strategy: "saml";
  //         external_verification_redirect_url: null;
  //         error: {
  //           message: "string";
  //           long_message: "string";
  //           code: "string";
  //           meta: {};
  //         };
  //         expire_at: null;
  //         attempts: null;
  //         verified_at_client: null;
  //       };
  //       saml_connection: {
  //         id: "string";
  //         name: "string";
  //         domains: ["string"];
  //         active: true;
  //         provider: "string";
  //         sync_user_attributes: true;
  //         allow_subdomains: true;
  //         allow_idp_initiated: true;
  //         disable_additional_identifications: true;
  //         created_at: 1;
  //         "...": "[Additional Properties Truncated]";
  //       };
  //     },
  //   ];
  last_sign_in_at: number | null; // in days
  banned: boolean;
  locked: boolean;
  lockout_expires_in_seconds: number | null;
  verification_attempts_remaining: any | null;
  updated_at: Date; // integer = Unix timestamp
  created_at: Date; // integer = Unix timestamp
  delete_self_enabled: boolean;
  create_organization_enabled: boolean;
  create_organizations_limit: number | null;
  last_active_at: number | null; // in days
  legal_accepted_at: number | null; // in days
}

export interface ClerkUserUpdates {
  clerkId?: string;
  first_name?: string;
  last_name?: string;
  primary_email_id?: string;
  role?: UserRole;
  marketCenterId?: string;
  invited?: boolean;
  invitedOn?: Date;
  accepted?: boolean;
  acceptedOn?: Date;
}
