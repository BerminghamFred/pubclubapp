'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

interface AreaOption {
  slug: string;
  name: string;
}

interface AmenityOption {
  slug: string;
  title: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '') || '';
}

interface BlogPostEditorProps {
  postId?: string;
}

export default function BlogPostEditor({ postId }: BlogPostEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [amenities, setAmenities] = useState<AmenityOption[]>([]);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'Pub Club',
    tags: '',
    published: false,
    metaTitle: '',
    metaDescription: '',
    imageUrl: '',
    suggestedLinkType: '' as '' | 'area' | 'vibe' | 'pubs',
    suggestedLinkSlug: '',
    suggestedLinkLabel: '',
    mapEnabled: false,
    mapType: 'amenity' as 'area' | 'amenity',
    mapSlug: '',
  });

  useEffect(() => {
    fetchOptions();
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/admin/blog/options');
      if (res.ok) {
        const data = await res.json();
        setAreas(data.areas ?? []);
        setAmenities(data.amenities ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch options:', e);
    }
  };

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`);
      if (!res.ok) throw new Error('Failed to load post');
      const data = await res.json();
      const p = data.post;
      const mapConfig = (p.mapConfig ?? {}) as { enabled?: boolean; type?: string; slug?: string };
      setForm({
        title: p.title ?? '',
        slug: p.slug ?? '',
        excerpt: p.excerpt ?? '',
        content: p.content ?? '',
        author: p.author ?? 'Pub Club',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags ?? ''),
        published: !!p.published,
        metaTitle: p.metaTitle ?? '',
        metaDescription: p.metaDescription ?? '',
        imageUrl: p.imageUrl ?? '',
        suggestedLinkType: (p.suggestedLinkType as '' | 'area' | 'vibe' | 'pubs') ?? '',
        suggestedLinkSlug: p.suggestedLinkSlug ?? '',
        suggestedLinkLabel: p.suggestedLinkLabel ?? '',
        mapEnabled: !!mapConfig.enabled,
        mapType: (mapConfig.type === 'area' ? 'area' : 'amenity') as 'area' | 'amenity',
        mapSlug: mapConfig.slug ?? '',
      });
    } catch (e) {
      console.error('Error loading post:', e);
      alert('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: postId ? prev.slug : (prev.slug || slugify(title)),
    }));
  };

  const buildMapConfig = () => {
    if (!form.mapEnabled || !form.mapSlug) return null;
    return {
      enabled: true,
      type: form.mapType,
      slug: form.mapSlug,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const slug = (form.slug || slugify(form.title)).trim();
    if (!slug) {
      setFormError('Slug or title required');
      return;
    }
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: form.title || 'Untitled',
      slug,
      excerpt: form.excerpt ?? '',
      content: form.content ?? '',
      author: form.author ?? 'Pub Club',
      tags,
      published: form.published,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      imageUrl: form.imageUrl || null,
      suggestedLinkType: form.suggestedLinkType || null,
      suggestedLinkSlug: form.suggestedLinkSlug || null,
      suggestedLinkLabel: form.suggestedLinkLabel || null,
      mapConfig: buildMapConfig(),
    };

    setSaving(true);
    try {
      if (postId) {
        const res = await fetch(`/api/admin/blog/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'Failed to update');
          return;
        }
        router.push('/admin/blog');
      } else {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'Failed to create');
          return;
        }
        router.push('/admin/blog');
      }
    } catch (e) {
      console.error('Save error:', e);
      setFormError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleImproveWithAi = async () => {
    const input: Record<string, string> = {};
    if (form.title) input.title = form.title;
    if (form.excerpt) input.excerpt = form.excerpt;
    if (form.content) input.content = form.content;
    if (form.metaTitle) input.metaTitle = form.metaTitle;
    if (form.metaDescription) input.metaDescription = form.metaDescription;
    
    // Always include title/excerpt/content if provided to generate meta fields
    const hasContent = form.title || form.excerpt || form.content;
    if (!hasContent) {
      setAiError('Add at least one of: title, excerpt, or content');
      return;
    }
    
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/admin/blog/ai-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'AI improve failed');
        return;
      }
      const suggested = data.suggested ?? {};
      setForm((prev) => ({
        ...prev,
        title: suggested.title ?? prev.title,
        excerpt: suggested.excerpt ?? prev.excerpt,
        content: suggested.content ?? prev.content,
        metaTitle: suggested.metaTitle ?? prev.metaTitle,
        metaDescription: suggested.metaDescription ?? prev.metaDescription,
      }));
    } catch (e) {
      setAiError('Network error');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#08d78c]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="url-slug"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="excerpt">Excerpt</Label>
          <Input
            id="excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
            placeholder="Short summary"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="content">Content</Label>
          <textarea
            id="content"
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Post body (plain text; newlines = paragraphs)"
            rows={12}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={form.author}
              onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
              placeholder="Pub Club"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="london, six nations, pubs"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={form.published}
            onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <Label htmlFor="published">Published</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="metaTitle">Meta title (SEO)</Label>
            <Input
              id="metaTitle"
              value={form.metaTitle}
              onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
              placeholder="Optional - will be auto-generated with AI"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="metaDescription">Meta description (SEO)</Label>
            <Input
              id="metaDescription"
              value={form.metaDescription}
              onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="Optional - will be auto-generated with AI"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="imageUrl">Hero image URL</Label>
          <Input
            id="imageUrl"
            value={form.imageUrl}
            onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
            placeholder="https://..."
            className="mt-1"
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Suggested link (CTA)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Type</Label>
              <select
                value={form.suggestedLinkType}
                onChange={(e) => setForm((p) => ({ ...p, suggestedLinkType: e.target.value as '' | 'area' | 'vibe' | 'pubs', suggestedLinkSlug: '' }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">None</option>
                <option value="area">Area</option>
                <option value="vibe">Vibe</option>
                <option value="pubs">Pubs</option>
              </select>
            </div>
            {form.suggestedLinkType === 'area' && (
              <div>
                <Label>Area</Label>
                <select
                  value={form.suggestedLinkSlug}
                  onChange={(e) => setForm((p) => ({ ...p, suggestedLinkSlug: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select area</option>
                  {areas.map((a) => (
                    <option key={a.slug} value={a.slug}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.suggestedLinkType === 'vibe' && (
              <div>
                <Label>Vibe / amenity</Label>
                <select
                  value={form.suggestedLinkSlug}
                  onChange={(e) => setForm((p) => ({ ...p, suggestedLinkSlug: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select vibe</option>
                  {amenities.map((a) => (
                    <option key={a.slug} value={a.slug}>{a.title}</option>
                  ))}
                </select>
              </div>
            )}
            {form.suggestedLinkType === 'pubs' && (
              <div>
                <Label>Search query (optional)</Label>
                <Input
                  value={form.suggestedLinkSlug}
                  onChange={(e) => setForm((p) => ({ ...p, suggestedLinkSlug: e.target.value }))}
                  placeholder="e.g. six nations"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>CTA label</Label>
              <Input
                value={form.suggestedLinkLabel}
                onChange={(e) => setForm((p) => ({ ...p, suggestedLinkLabel: e.target.value }))}
                placeholder="e.g. Pubs showing Six Nations"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="mapEnabled"
              checked={form.mapEnabled}
              onChange={(e) => setForm((p) => ({ ...p, mapEnabled: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="mapEnabled">Show map on this post</Label>
          </div>
          {form.mapEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <Label>Map type</Label>
                <select
                  value={form.mapType}
                  onChange={(e) => setForm((p) => ({ ...p, mapType: e.target.value as 'area' | 'amenity', mapSlug: '' }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="area">Area</option>
                  <option value="amenity">Amenity / vibe</option>
                </select>
              </div>
              <div>
                <Label>Slug</Label>
                {form.mapType === 'area' ? (
                  <select
                    value={form.mapSlug}
                    onChange={(e) => setForm((p) => ({ ...p, mapSlug: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select area</option>
                    {areas.map((a) => (
                      <option key={a.slug} value={a.slug}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={form.mapSlug}
                    onChange={(e) => setForm((p) => ({ ...p, mapSlug: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select amenity</option>
                    {amenities.map((a) => (
                      <option key={a.slug} value={a.slug}>{a.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleImproveWithAi} disabled={aiLoading}>
            <Sparkles className="w-4 h-4 mr-2" />
            {aiLoading ? 'Improving…' : 'Improve with AI'}
          </Button>
          {aiError && <span className="text-sm text-red-600">{aiError}</span>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/blog')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#08d78c] hover:bg-[#07c47a] text-gray-900">
            {saving ? 'Saving…' : postId ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
