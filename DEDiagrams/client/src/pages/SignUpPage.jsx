import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: '#0d1117' }}
    >
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" afterSignUpUrl="/" />
    </div>
  );
}
