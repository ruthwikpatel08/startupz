import React, { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  noindex?: boolean;
  breadcrumbs?: Array<{ name: string; path: string }>;
  schema?: Record<string, any>;
}

const SITE_NAME = 'HookZ';
const BASE_URL = 'https://hookz.in';
const DEFAULT_TITLE = 'HookZ — Connect with Founders, Co-Founders & Investors';
const DEFAULT_DESC =
  'HookZ is a startup networking platform where founders, co-founders, mentors and investors connect, discover opportunities and build startups together.';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

function setMetaTag(selector: string, attribute: string, attrName: string, value: string) {
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attribute);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  noindex = false,
  breadcrumbs,
  schema,
}) => {
  useEffect(() => {
    // 1. Title
    const finalTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : DEFAULT_TITLE;
    document.title = finalTitle;

    // 2. Meta description
    const finalDesc = description || DEFAULT_DESC;
    setMetaTag('meta[name="description"]', 'description', 'name', finalDesc);

    // 3. Canonical URL
    const cleanPath = canonicalPath ? (canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`) : '';
    // Handle home without duplicate trailing slash
    const finalCanonical = cleanPath === '' || cleanPath === '/' ? `${BASE_URL}/` : `${BASE_URL}${cleanPath}`;
    setLinkTag('canonical', finalCanonical);

    // 4. Robots directive
    const robotsContent = noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMetaTag('meta[name="robots"]', 'robots', 'name', robotsContent);

    // 5. Open Graph metadata
    setMetaTag('meta[property="og:site_name"]', 'og:site_name', 'property', SITE_NAME);
    setMetaTag('meta[property="og:title"]', 'og:title', 'property', finalTitle);
    setMetaTag('meta[property="og:description"]', 'og:description', 'property', finalDesc);
    setMetaTag('meta[property="og:url"]', 'og:url', 'property', finalCanonical);
    setMetaTag('meta[property="og:type"]', 'og:type', 'property', ogType);
    setMetaTag('meta[property="og:image"]', 'og:image', 'property', ogImage);

    // 6. Twitter / X metadata
    setMetaTag('meta[name="twitter:card"]', 'twitter:card', 'name', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'twitter:title', 'name', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'twitter:description', 'name', finalDesc);
    setMetaTag('meta[name="twitter:image"]', 'twitter:image', 'name', ogImage);

    // 7. Structured Data (JSON-LD) for current page
    let scriptTag = document.getElementById('page-json-ld') as HTMLScriptElement | null;
    const schemasToInject: any[] = [];

    // WebPage schema
    if (!noindex) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: finalTitle,
        description: finalDesc,
        url: finalCanonical,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: SITE_NAME,
          url: `${BASE_URL}/`,
        },
      });

      // BreadcrumbList schema
      if (breadcrumbs && breadcrumbs.length > 0) {
        schemasToInject.push({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${BASE_URL}/`,
            },
            ...breadcrumbs.map((bc, idx) => ({
              '@type': 'ListItem',
              position: idx + 2,
              name: bc.name,
              item: bc.path.startsWith('http') ? bc.path : `${BASE_URL}${bc.path}`,
            })),
          ],
        });
      }

      if (schema) {
        schemasToInject.push(schema);
      }
    }

    if (schemasToInject.length > 0) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.id = 'page-json-ld';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemasToInject.length === 1 ? schemasToInject[0] : schemasToInject);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    // Cleanup on unmount / navigation
    return () => {
      const pageScript = document.getElementById('page-json-ld');
      if (pageScript) {
        pageScript.remove();
      }
    };
  }, [title, description, canonicalPath, ogType, ogImage, noindex, breadcrumbs, schema]);

  return null;
};
