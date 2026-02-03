'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Plus, Edit, Trash2 } from 'lucide-react';

interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  published: boolean;
  publishedAt: string | null;
  imageUrl: string | null;
  suggestedLinkType: string | null;
  suggestedLinkSlug: string | null;
  suggestedLinkLabel: string | null;
  mapConfig: { enabled?: boolean; type?: string; slug?: string } | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog?limit=100');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
        setTotal(data.total ?? 0);
      } else {
        setPosts([]);
        setTotal(0);
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e);
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    router.push('/admin/blog/new');
  };

  const openEdit = (id: string) => {
    router.push(`/admin/blog/${id}/edit`);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPosts();
      } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
      }
    } catch (e) {
      alert('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
              <p className="text-gray-600 mt-2">Create and manage blog posts</p>
            </div>
            <Button onClick={openCreate} className="bg-[#08d78c] hover:bg-[#07c47a] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              New post
            </Button>
          </div>
        </div>

        <nav className="mb-8 flex space-x-4">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900" onClick={() => router.push('/admin')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900 bg-gray-100" onClick={() => router.push('/admin/blog')}>
            <FileText className="w-4 h-4 mr-2" />
            Blog Posts
          </Button>
        </nav>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#08d78c]"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Posts ({total})</CardTitle>
              <CardDescription>Draft and published posts</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No posts yet. Create one to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 font-medium">Title</th>
                        <th className="pb-2 font-medium">Slug</th>
                        <th className="pb-2 font-medium">Author</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{p.title || 'Untitled'}</td>
                          <td className="py-3 text-gray-600 text-sm">{p.slug}</td>
                          <td className="py-3 text-sm">{p.author}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${p.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {p.published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : new Date(p.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p.id)} className="mr-1">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p.id, p.title)}
                              disabled={deleteId === p.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
