'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';

interface BlogPost {
  blog_post_id: string;
  restaurant_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  status: string;
  published_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM: Omit<BlogPost, 'blog_post_id' | 'restaurant_id' | 'created_at' | 'updated_at'> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image: '',
  author: '',
  status: 'draft',
  published_at: null,
  tags: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function BlogPostsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  // Image gallery modal
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Content editor ref
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog-posts?restaurant_id=${encodeURIComponent(restaurantId)}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      } else {
        toast(data.error || 'Failed to load posts', 'error');
      }
    } catch {
      toast('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    if (restaurantId) fetchPosts();
  }, [restaurantId, fetchPosts]);

  const openCreateModal = () => {
    setEditingPost(null);
    setFormData({ ...EMPTY_FORM });
    setTagInput('');
    setShowModal(true);
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.cover_image,
      author: post.author,
      status: post.status,
      published_at: post.published_at,
      tags: post.tags || [],
    });
    setTagInput('');
    setShowModal(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title when creating
      if (field === 'title' && !editingPost) {
        updated.slug = slugify(value);
      }
      return updated;
    });
  };

  const insertFormatting = (type: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const selected = text.substring(start, end);

    let before = '';
    let after = '';
    let replacement = '';

    switch (type) {
      case 'bold':
        before = '**';
        after = '**';
        replacement = selected || 'bold text';
        break;
      case 'italic':
        before = '*';
        after = '*';
        replacement = selected || 'italic text';
        break;
      case 'h2':
        before = '\n## ';
        after = '\n';
        replacement = selected || 'Heading';
        break;
      case 'h3':
        before = '\n### ';
        after = '\n';
        replacement = selected || 'Sub Heading';
        break;
      case 'link':
        before = '[';
        after = '](url)';
        replacement = selected || 'link text';
        break;
      case 'ul':
        before = '\n';
        after = '';
        replacement = (selected || 'List item').split('\n').map((l) => `- ${l}`).join('\n');
        break;
      case 'ol':
        before = '\n';
        after = '';
        replacement = (selected || 'List item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
        break;
      case 'quote':
        before = '\n> ';
        after = '\n';
        replacement = selected || 'Quote text';
        break;
      case 'code':
        before = '`';
        after = '`';
        replacement = selected || 'code';
        break;
      case 'divider':
        before = '\n---\n';
        after = '';
        replacement = '';
        break;
      default:
        return;
    }

    const newContent = text.substring(0, start) + before + replacement + after + text.substring(end);
    handleFormChange('content', newContent);

    // Restore cursor position after React re-render
    const cursorPos = start + before.length + replacement.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    if (!formData.title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingPost;
      const url = '/api/admin/blog-posts';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? { blog_post_id: editingPost!.blog_post_id, ...formData }
        : { restaurant_id: restaurantId, ...formData };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast(isEdit ? 'Post updated' : 'Post created', 'success');
        setShowModal(false);
        fetchPosts();
      } else {
        toast(data.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save post', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: deleteTarget.blog_post_id }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Post deleted', 'success');
        setDeleteTarget(null);
        fetchPosts();
      } else {
        toast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      toast('Failed to delete post', 'error');
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_post_id: post.blog_post_id,
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : post.published_at,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast(newStatus === 'published' ? 'Post published' : 'Post unpublished', 'success');
        fetchPosts();
      } else {
        toast(data.error || 'Failed to update status', 'error');
      }
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.author.toLowerCase().includes(q) &&
        !(p.tags || []).some((t) => t.toLowerCase().includes(q))
      )
        return false;
    }
    return true;
  });

  if (!restaurantId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Restaurant</h2>
          <p className="text-sm text-gray-600">Please select a restaurant from the sidebar to manage blog posts.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blog Posts</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage blog posts for {restaurantName || 'your restaurant'}
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Post
          </button>
        </div>

        {/* Filters */}
        {!loading && posts.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or tag..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="text-sm font-medium text-gray-700">Loading blog posts...</p>
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-purple-300 bg-purple-50">
                <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {posts.length === 0 ? 'No Blog Posts Yet' : 'No Matching Posts'}
              </h3>
              <p className="text-sm text-gray-600">
                {posts.length === 0
                  ? 'Create your first blog post to get started.'
                  : 'No posts match your current filters.'}
              </p>
              {posts.length === 0 && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create First Post
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Author</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPosts.map((post) => (
                    <tr key={post.blog_post_id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{post.title}</p>
                          {post.excerpt && (
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>
                          )}
                          {post.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {post.tags.map((tag) => (
                                <span key={tag} className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.author || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(post)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            post.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(post.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(post)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(post)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowModal(false)}>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPost ? 'Edit Blog Post' : 'New Blog Post'}
                </h2>
                <button onClick={() => setShowModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Enter post title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleFormChange('slug', e.target.value)}
                  placeholder="auto-generated-from-title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Author + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => handleFormChange('author', e.target.value)}
                    placeholder="Author name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                {formData.cover_image ? (
                  <div className="relative rounded-lg border border-gray-200 overflow-hidden">
                    <img src={formData.cover_image} alt="Cover preview" className="h-40 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMediaModal(true)}
                        className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('cover_image', '')}
                        className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-white transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    Select from gallery or upload image
                  </button>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => handleFormChange('excerpt', e.target.value)}
                  placeholder="Short summary of the post..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                {/* Formatting toolbar */}
                <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 px-2 py-1.5">
                  <button type="button" onClick={() => insertFormatting('bold')} title="Bold" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 15.5H10V12.5H13.5C14.33 12.5 15 13.17 15 14C15 14.83 14.33 15.5 13.5 15.5ZM10 6.5H13C13.83 6.5 14.5 7.17 14.5 8C14.5 8.83 13.83 9.5 13 9.5H10V6.5ZM15.6 10.79C16.57 10.12 17.25 9.02 17.25 8C17.25 5.74 15.5 4 13.25 4H7V18H14.04C16.13 18 17.75 16.3 17.75 14.21C17.75 12.69 16.89 11.39 15.6 10.79Z"/></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('italic')} title="Italic" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 5V7H12.21L8.79 17H6V19H14V17H11.79L15.21 7H18V5H10Z"/></svg>
                  </button>
                  <div className="mx-1 h-5 w-px bg-gray-300" />
                  <button type="button" onClick={() => insertFormatting('h2')} title="Heading 2" className="rounded px-1.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    H2
                  </button>
                  <button type="button" onClick={() => insertFormatting('h3')} title="Heading 3" className="rounded px-1.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    H3
                  </button>
                  <div className="mx-1 h-5 w-px bg-gray-300" />
                  <button type="button" onClick={() => insertFormatting('link')} title="Link" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('ul')} title="Bullet List" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('ol')} title="Numbered List" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('quote')} title="Quote" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('code')} title="Inline Code" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                  </button>
                  <button type="button" onClick={() => insertFormatting('divider')} title="Divider" className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M3 12h18" /></svg>
                  </button>
                </div>
                <textarea
                  ref={contentRef}
                  value={formData.content}
                  onChange={(e) => handleFormChange('content', e.target.value)}
                  placeholder="Write your blog post content here... Use the toolbar above to format text."
                  rows={12}
                  className="w-full rounded-b-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-400">Supports Markdown: **bold**, *italic*, ## heading, [link](url), - list, &gt; quote</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag and press Enter"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-purple-400 hover:text-purple-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Delete Blog Post</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={(imageUrl: string) => {
          handleFormChange('cover_image', imageUrl);
          setShowMediaModal(false);
        }}
        restaurantId={restaurantId || undefined}
        title="Select Cover Image"
        description="Choose an image from your media library or upload a new one"
      />

      {showToast && (
        <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
      )}
    </>
  );
}

export default function BlogPostsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogPostsContent />
    </Suspense>
  );
}
