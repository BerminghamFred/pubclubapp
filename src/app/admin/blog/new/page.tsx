'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BlogPostEditor from '@/components/admin/blog/BlogPostEditor';

export default function NewBlogPostPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/blog')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog Posts
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">New Blog Post</h1>
        </div>
        <BlogPostEditor />
      </div>
    </div>
  );
}
