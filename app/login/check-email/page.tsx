export const metadata = { title: "Check Your Email — What's For Dinner?" };

export default function CheckEmailPage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm space-y-4 text-center">
        <span className="text-4xl select-none">📬</span>
        <h1 className="text-xl font-bold text-orange-800">Check your email</h1>
        <p className="text-sm text-gray-600">
          We sent a sign-in link to your email address. Click the link to sign
          in — it expires in 24 hours.
        </p>
        <p className="text-xs text-gray-400">
          If you don&apos;t see it, check your spam folder.
        </p>
      </div>
    </main>
  );
}
