import { signIn } from "@/auth";

export const metadata = { title: "Sign In — What's For Dinner?" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="text-4xl select-none">🍽️</span>
          <h1 className="text-xl font-bold text-orange-800">What&apos;s For Dinner?</h1>
          <p className="text-sm text-gray-500">Sign in with your email to continue</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">
            {error === "EmailSignin"
              ? "Couldn't send the sign-in email — please try again."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            const email = formData.get("email") as string;
            await signIn("resend", {
              email,
              redirectTo: callbackUrl ?? "/",
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Send sign-in link
          </button>
        </form>
      </div>
    </main>
  );
}
