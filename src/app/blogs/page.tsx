'use client';

import { useEffect, useState, useMemo } from 'react';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import type { GlobalStyleConfig } from '@/types/global-style.types';
import { DEFAULT_GLOBAL_STYLE_CONFIG } from '@/types/global-style.types';

/**
 * Lightweight Markdown to HTML converter.
 * Covers: headings, bold, italic, links, lists (ul/ol), blockquotes,
 * inline code, horizontal rules, and paragraphs.
 */
function markdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^---$/gm, '<hr/>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/(^- .+$(\n- .+$)*)/gm, (match) => {
    const items = match.split('\n').map((l) => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  html = html.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (match) => {
    const items = match.split('\n').map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|hr|p)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

interface BlogPost {
  blog_post_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  published_at: string | null;
  tags: string[];
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [topSpacing, setTopSpacing] = useState<string>('0px');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Fetch global styles for this restaurant
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: `/api/global-style-config?restaurant_id=${restaurantId}`,
    fetchOnMount: !!restaurantId,
  });

  // Resolve styles with defaults
  const styles: GlobalStyleConfig = useMemo(() => {
    return { ...DEFAULT_GLOBAL_STYLE_CONFIG, ...globalStyles };
  }, [globalStyles]);

  const fontFamily = styles.title?.fontFamily || styles.paragraph?.fontFamily || 'Poppins, sans-serif';
  const titleColor = styles.title?.color || '#111827';
  const titleWeight = styles.title?.fontWeight || 700;
  const subheadingColor = styles.subheading?.color || '#374151';
  const subheadingWeight = styles.subheading?.fontWeight || 600;
  const paragraphColor = styles.paragraph?.color || '#6b7280';
  const paragraphWeight = styles.paragraph?.fontWeight || 400;
  const accentColor = styles.accentColor || '#8b5cf6';
  const bgColor = styles.backgroundColor || '#ffffff';
  const textColor = styles.textColor || '#111827';

  useEffect(() => {
    const calculateSpacing = () => {
      const navbarHeight = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height').trim();
      const announcementHeight = getComputedStyle(document.documentElement).getPropertyValue('--announcement-bar-height').trim();
      const navbarPx = navbarHeight && navbarHeight !== '0px' ? navbarHeight : '0px';
      const announcementPx = announcementHeight && announcementHeight !== '0px' ? announcementHeight : '0px';
      if (navbarPx === '0px' && announcementPx === '0px') {
        setTopSpacing('0px');
      } else {
        setTopSpacing(`calc(${navbarPx} + ${announcementPx})`);
      }
    };
    calculateSpacing();
    let rafId = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateSpacing);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => { cancelAnimationFrame(rafId); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const domain = window.location.host;
        const res = await fetch(`/api/blog-posts?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();
        if (data.success) {
          setPosts(data.posts || []);
          // Extract restaurant_id from the first post if available
          if (data.restaurant_id) {
            setRestaurantId(data.restaurant_id);
          }
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderedContent = useMemo(() => {
    if (!selectedPost) return '';
    return markdownToHtml(selectedPost.content || '');
  }, [selectedPost]);

  // Dynamic blog content styles using global theme
  const blogContentStyles = useMemo(() => `
    .blog-content { font-family: ${fontFamily}; font-size: ${styles.paragraph?.fontSize || '1rem'}; line-height: ${styles.paragraph?.lineHeight || '1.8'}; color: ${paragraphColor}; word-break: break-word; }
    .blog-content h2 { font-family: ${fontFamily}; font-size: ${styles.subheading?.fontSize || '1.5rem'}; font-weight: ${subheadingWeight}; color: ${titleColor}; margin: 32px 0 16px; line-height: ${styles.subheading?.lineHeight || '1.3'}; letter-spacing: ${styles.subheading?.letterSpacing || '-0.015em'}; }
    .blog-content h3 { font-family: ${fontFamily}; font-size: 1.25rem; font-weight: ${subheadingWeight}; color: ${titleColor}; margin: 28px 0 12px; line-height: 1.4; }
    .blog-content p { margin: 0 0 16px; }
    .blog-content strong { font-weight: 700; color: ${titleColor}; }
    .blog-content em { font-style: italic; }
    .blog-content a { color: ${accentColor}; text-decoration: underline; text-underline-offset: 2px; }
    .blog-content a:hover { opacity: 0.8; }
    .blog-content ul { list-style: disc; padding-left: 24px; margin: 0 0 16px; }
    .blog-content ol { list-style: decimal; padding-left: 24px; margin: 0 0 16px; }
    .blog-content li { margin-bottom: 6px; }
    .blog-content blockquote { border-left: 4px solid ${accentColor}; padding: 12px 20px; margin: 16px 0; color: ${paragraphColor}; font-style: italic; background: ${bgColor}; border-radius: 0 8px 8px 0; }
    .blog-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; color: ${accentColor}; }
    .blog-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
  `, [fontFamily, styles, titleColor, subheadingWeight, paragraphColor, accentColor, bgColor]);

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: bgColor, paddingTop: topSpacing, fontFamily }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, margin: '0 auto 12px', borderRadius: '50%',
              border: `3px solid #d1d5db`, borderTopColor: titleColor,
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: paragraphColor, fontSize: 14, fontWeight: 500, fontFamily }}>Loading blog posts...</p>
          </div>
        </div>
      </main>
    );
  }

  if (posts.length === 0) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: bgColor, paddingTop: topSpacing, fontFamily }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h1 style={{ fontSize: styles.title?.fontSize || '2.25rem', fontWeight: titleWeight, color: titleColor, marginBottom: 8, fontFamily }}>No Blog Posts Yet</h1>
            <p style={{ fontSize: styles.paragraph?.fontSize || '1rem', color: paragraphColor, fontFamily }}>Check back soon for new articles and updates.</p>
          </div>
        </div>
      </main>
    );
  }

  // Single post view
  if (selectedPost) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: bgColor, paddingTop: topSpacing, fontFamily }}>
        <article style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
          <button
            onClick={() => setSelectedPost(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: paragraphColor, fontSize: 14, fontWeight: 500,
              marginBottom: 32, padding: 0, fontFamily,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to all posts
          </button>

          {selectedPost.cover_image && (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
              <img
                src={selectedPost.cover_image}
                alt={selectedPost.title}
                style={{ width: '100%', height: 400, objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            {selectedPost.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-block', padding: '4px 12px',
                      backgroundColor: `${accentColor}15`, borderRadius: 9999,
                      fontSize: 12, fontWeight: 500, color: accentColor, fontFamily,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 style={{
              fontSize: styles.title?.fontSize || '2.25rem',
              fontWeight: titleWeight,
              color: titleColor,
              lineHeight: styles.title?.lineHeight || '1.2',
              letterSpacing: styles.title?.letterSpacing || '-0.025em',
              marginBottom: 16,
              fontFamily,
            }}>
              {selectedPost.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: paragraphColor, fontSize: 14, fontFamily }}>
              {selectedPost.author && <span>By {selectedPost.author}</span>}
              {selectedPost.author && selectedPost.published_at && <span style={{ opacity: 0.4 }}>|</span>}
              {selectedPost.published_at && <span>{formatDate(selectedPost.published_at)}</span>}
            </div>
          </div>

          <style>{blogContentStyles}</style>
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </article>
      </main>
    );
  }

  // Blog listing
  return (
    <main style={{ minHeight: '100vh', backgroundColor: bgColor, paddingTop: topSpacing, fontFamily }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontSize: styles.title?.fontSize || '2.25rem',
            fontWeight: titleWeight,
            color: titleColor,
            marginBottom: 8,
            lineHeight: styles.title?.lineHeight || '1.2',
            letterSpacing: styles.title?.letterSpacing || '-0.025em',
            fontFamily,
          }}>
            Blog
          </h1>
          <p style={{
            fontSize: styles.paragraph?.fontSize || '1rem',
            color: paragraphColor,
            fontFamily,
          }}>
            Latest articles and updates
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 32,
          }}
        >
          {posts.map((post) => (
            <article
              key={post.blog_post_id}
              onClick={() => setSelectedPost(post)}
              style={{
                backgroundColor: bgColor,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              {post.cover_image ? (
                <div style={{ height: 200, overflow: 'hidden' }}>
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div style={{
                  height: 200, backgroundColor: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="48" height="48" fill="none" stroke="#d1d5db" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
              )}

              <div style={{ padding: '20px 24px 24px' }}>
                {post.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-block', padding: '2px 10px',
                          backgroundColor: `${accentColor}15`, borderRadius: 9999,
                          fontSize: 11, fontWeight: 500, color: accentColor, fontFamily,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <h2 style={{
                  fontSize: styles.subheading?.fontSize || '1.5rem',
                  fontWeight: subheadingWeight,
                  color: titleColor,
                  marginBottom: 8,
                  lineHeight: styles.subheading?.lineHeight || '1.3',
                  fontFamily,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p style={{
                    fontSize: styles.paragraph?.fontSize || '1rem',
                    color: paragraphColor,
                    lineHeight: styles.paragraph?.lineHeight || '1.6',
                    marginBottom: 16,
                    fontFamily,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {post.excerpt}
                  </p>
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 13, color: paragraphColor, opacity: 0.7, fontFamily,
                }}>
                  <span>{post.author || 'Unknown'}</span>
                  <span>{formatDate(post.published_at)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
