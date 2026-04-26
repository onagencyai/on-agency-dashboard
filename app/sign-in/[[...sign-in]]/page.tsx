export const dynamic = "force-dynamic";

import { SignIn } from "@clerk/nextjs";
import LogoMark from "@/components/LogoMark";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#0a0a0a" }}
    >
      <div className="flex flex-col items-center" style={{ gap: 32 }}>
        <LogoMark size={36} style={{ color: "#ededed" }} />
        <SignIn
          routing="path"
          path="/sign-in"
          afterSignInUrl="/dashboard"
          signUpUrl={undefined}
        />
      </div>
    </div>
  );
}
