import { UserInfoClient } from "auth0";
import { Gateway, Header, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import jwt from "jsonwebtoken";
import { AUDIENCE, DOMAIN } from "./config";
import fetch from "node-fetch";

// Download from Auth0 Dashboard → Applications → <YOUR APP> → Settings → Show Advanced Settings → Certificates
const publicCert = secret("Auth0PEMCertificate");

interface AuthParams {
  authorization: Header<"Authorization">;
}

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

const userInfoClient = new UserInfoClient({
  domain: DOMAIN,
});

export const signUpWithAuth0 = async (
  email: string,
  password: string,
  name: string
): Promise<boolean> => {
  try {
    if (
      !process.env.AUTH0_DOMAIN ||
      !process.env.AUTH0_CLIENT_ID ||
      !process.env.AUTH0_CLIENT_SECRET
    ) {
      throw new Error("Auth0 info missing");
    }

    const response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/dbconnections/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${process.env.AUTH0_CLIENT_SECRET}`,
        },
        body: JSON.stringify({
          client_id: process.env.AUTH0_CLIENT_ID,
          email: email,
          password: password,
          connection: "Username-Password-Authentication",
          name: name || "",
        }),
      }
    );

    if (!response || !response.ok) {
      const errorText = await response.text();
      console.error("Auth0 Response:", errorText);
      throw new Error("Auth0 Response not ok");
    }

    const result = await response.json();
    console.log("Auth0 signup success:", result);
    return true;
  } catch (error) {
    console.error("Error during Auth0 signup:", error);
    return false;
  }
};

// The function passed to authHandler will be called for all incoming API call that requires authentication.
// Remove if your app does not require authentication.
const myAuthHandler = authHandler(
  async (params: AuthParams): Promise<AuthData> => {
    const token = params.authorization.replace("Bearer ", "");
    if (!token) {
      throw APIError.unauthenticated("no token provided");
    }

    // Local development mode - accept "local" as bypass token
    if (process.env.NODE_ENV === "development" && token === "local") {
      console.log("🔧 Local development mode: accepting 'local' token");
      // // DEFAULT
      return {
        userID: "local-dev-user",
        imageUrl: "https://via.placeholder.com/150",
        emailAddress: "local@localhost.com",
      };

      // // AGENT
      // return {
      //   userID: "auth0|68c07090070c5a2759e2c928",
      //   imageUrl: "https://via.placeholder.com/150",
      //   emailAddress: "alice.agent@kw.com",
      // };

      // // STAFF
      // return {
      //   userID: "auth0|68c070b2070c5a2759e2c934",
      //   imageUrl: "https://via.placeholder.com/150",
      //   emailAddress: "bob.staff@kw.com",
      // };

      // // ADMIN
      // return {
      //   userID: "auth0|68c070eba093c0727999c608",
      //   imageUrl: "https://via.placeholder.com/150",
      //   emailAddress: "clara.admin@kw.com",
      // };
    }

    try {
      // Verify the JWT (production)
      jwt.verify(token, publicCert(), {
        algorithms: ["RS256"],
        issuer: "https://" + DOMAIN + "/",
        audience: AUDIENCE,
      });
      // Get the user info
      const userInfo = await userInfoClient.getUserInfo(token);
      console.log({ userInfo });

      return {
        userID: userInfo.data.sub,
        imageUrl: userInfo.data.picture ?? null,
        emailAddress: userInfo.data.email,
      };
    } catch (e) {
      throw APIError.unauthenticated("invalid token");
    }
  }
);

export const mygw = new Gateway({ authHandler: myAuthHandler });
