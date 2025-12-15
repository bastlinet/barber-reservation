import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

function normalizeEmail(value?: string | null) {
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

const allowlist = new Set<string>();
const envAllowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
  .split(",")
  .map((email) => normalizeEmail(email))
  .filter((email): email is string => Boolean(email));

envAllowlist.forEach((email) => allowlist.add(email));

const devModeEnabled = process.env.ADMIN_DEV_MODE === "true";
const devEmail = normalizeEmail(process.env.ADMIN_DEV_EMAIL ?? "admin@localdev.local");
const devPassword = process.env.ADMIN_DEV_PASSWORD ?? "dev-password";

if (devModeEnabled && devEmail) {
  allowlist.add(devEmail);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  if (allowlist.size === 0) return false;
  return allowlist.has(email.toLowerCase());
}

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleProvider =
  googleClientId && googleClientSecret
    ? GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret
      })
    : null;

const devCredentialsProvider =
  devModeEnabled && devEmail
    ? CredentialsProvider({
        name: "Local admin",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          const email = normalizeEmail(credentials?.email);
          const password = credentials?.password;
          if (email === devEmail && password === devPassword) {
            return { id: "dev-admin", email: devEmail, name: "Local admin" };
          }
          return null;
        }
      })
    : null;

const providers = [
  ...(googleProvider ? [googleProvider] : []),
  ...(devCredentialsProvider ? [devCredentialsProvider] : [])
];

if (providers.length === 0) {
  throw new Error(
    "Chybí autentizační provider: nastavte GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET nebo povolte ADMIN_DEV_MODE."
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      const email = normalizeEmail(user?.email ?? profile?.email);
      return isEmailAllowed(email ?? null);
    },
    async jwt({ token, user, profile }) {
      const email = normalizeEmail(user?.email ?? profile?.email ?? token.email);
      const name = user?.name ?? profile?.name ?? token.name;

      if (email) {
        token.email = email;
      }
      if (name) {
        token.name = name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      if (session.user && token.name) {
        session.user.name = token.name as string;
      }
      return session;
    }
  }
};
