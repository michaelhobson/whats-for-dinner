import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign In — What's For Dinner?" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="text-4xl select-none">🍽️</span>
          <h1 className="text-xl font-bold text-orange-800">What&apos;s For Dinner?</h1>
          <p className="text-sm text-gray-500">Enter the passcode to continue</p>
        </div>
        <LoginForm from={from} />
      </div>
    </main>
  );
}
