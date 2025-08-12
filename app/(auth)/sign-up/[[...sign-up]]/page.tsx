import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass p-8 rounded-lg">
        <SignUp />
      </div>
    </div>
  );
}