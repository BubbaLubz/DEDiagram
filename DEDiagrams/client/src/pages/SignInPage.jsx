import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: '#0d1117' }}
    >
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" afterSignInUrl="/" />
    </div>
  );
}
