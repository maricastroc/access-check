import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Persiste User + Account no banco (é o que liga os scans ao usuário),
  // mas a sessão trafega via JWT — sem usar a tabela Session.
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Tela de login própria (em vez da página padrão do Auth.js).
  pages: { signIn: "/login" },
  providers: [
    // allowDangerousEmailAccountLinking ligado de propósito: logar com GitHub e
    // Google no mesmo email cai na MESMA conta. É seguro porque ambos verificam
    // o email — sem isso, seria vetor de account-takeover.
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  callbacks: {
    // No primeiro login o `user` (vindo do adapter) traz o id; guardamos no
    // token pra ele sobreviver nas próximas requisições (sessão é só o JWT).
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Expõe o id no `session.user` pra poder ligar scans ao usuário no servidor.
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
