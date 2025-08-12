import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass p-8 rounded-lg">
        <SignIn />
      </div>
    </div>
  );
}