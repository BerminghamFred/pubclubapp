import Link from 'next/link';
import type { Metadata } from 'next';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'Sign in is temporarily unavailable. Please contact support if this continues.',
  AccessDenied: 'You do not have permission to access this resource.',
  Verification: 'The verification link is invalid or has expired.',
  Default: 'An unexpected error occurred while trying to sign you in.',
};

export const metadata: Metadata = {
  title: 'Sign in error | Pub Club',
};

type AuthErrorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const errorParam = params.error;
  const errorCode =
    (Array.isArray(errorParam) ? errorParam[0] : errorParam) ?? 'Default';
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Sign in error</h1>
          <p className="mt-3 text-sm text-gray-600">{message}</p>
          {errorCode && errorCode !== 'Default' ? (
            <p className="mt-2 text-xs text-gray-400">Error code: {errorCode}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Link
            href="/admin-login"
            className="inline-flex w-full justify-center rounded-lg bg-[#08d78c] px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-[#06b875]"
          >
            Return to admin login
          </Link>
          <Link
            href="/"
            className="inline-flex w-full justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

