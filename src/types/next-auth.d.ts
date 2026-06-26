import type { DefaultSession } from "next-auth";

// Adiciona `id` ao usuário da sessão (preenchido pelo callback `session`).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
