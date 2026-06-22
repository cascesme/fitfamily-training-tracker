import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <SignIn
        appearance={{
          variables: {
            colorBackground: '#111111',
            colorForeground: '#ffffff',
            colorPrimary: '#E85D26',
            colorInput: '#1A1A1A',
            colorInputForeground: '#ffffff',
          },
          elements: {
            card: 'border border-[rgba(255,255,255,0.08)] rounded-lg shadow-none',
            footer: 'hidden',
            socialButtonsBlockButton: 'border border-[rgba(255,255,255,0.08)]',
          },
        }}
        routing="path"
        path="/sign-in"
      />
    </div>
  )
}
