import { Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="mt-4">Check your email</CardTitle>
          <CardDescription>
            We've sent you a magic link to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Click the link in your email to sign in. The link will expire in 24 hours.
          </p>
          <p className="text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or try signing in again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
