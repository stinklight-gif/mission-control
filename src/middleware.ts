import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized"]);

const ALLOWED_EMAIL = "rid243@gmail.com";

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId } = await auth();

  // Not signed in → redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Signed in → verify it's the right account
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const emails = user.emailAddresses.map((e) => e.emailAddress);

    if (!emails.includes(ALLOWED_EMAIL)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  } catch {
    // Can't verify → block access to be safe
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"]
};
