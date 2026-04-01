import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import type { User } from "@prisma/client";

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: `http://localhost:${env.PORT}/api/auth/github/callback`,
      scope: ["read:user", "user:email"],
    },
    async (
      accessToken: string,
      _refreshToken: string,
      profile: {
        id: string;
        username?: string;
        displayName?: string;
        emails?: Array<{ value: string }>;
        photos?: Array<{ value: string }>;
      },
      done: (err: Error | null, user?: User | false) => void
    ) => {
      try {
        const githubId = parseInt(profile.id, 10);
        const username = profile.username ?? `user_${githubId}`;
        const email = profile.emails?.[0]?.value ?? null;
        const avatarUrl = profile.photos?.[0]?.value ?? null;
        const displayName = profile.displayName ?? username;

        // Upsert the user
        const user = await prisma.user.upsert({
          where: { githubId },
          update: { username, displayName, email, avatarUrl },
          create: { githubId, username, displayName, email, avatarUrl },
        });

        // Upsert the OAuth account (update access token on each login)
        await prisma.account.upsert({
          where: { userId_provider: { userId: user.id, provider: "github" } },
          update: { accessToken },
          create: { userId: user.id, provider: "github", accessToken },
        });

        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

export default passport;
