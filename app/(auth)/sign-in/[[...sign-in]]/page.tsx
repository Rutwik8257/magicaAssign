import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <SignIn />
    </div>
  );
}
