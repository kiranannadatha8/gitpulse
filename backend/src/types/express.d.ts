import type { User } from "@prisma/client";

declare global {
  namespace Express {
    // Augment the User type used by Passport's req.user
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends Omit<import("@prisma/client").User, never> {}
  }
}

export {};
