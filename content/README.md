# How to Add a New Content Section

This guide explains how to add a new content section (like `/news`, `/tutorials`, etc.) to the site.

---

## Example: Adding `/news` Section

### Step 1: Update `hugo.yaml`

#### 1a. Add Section Config

**Why:** This tells the footer what title and button text to show when viewing news pages.

**What it does:** When you're on a news page, the footer will show "Latest News" instead of "Recent Posts".

```yaml
params:
  contentSections:
    news:
      recentTitle: "Latest News"
      viewAllText: "View All News"
      taxonomies: ["news_categories", "news_tags"]
```

**Note on `taxonomies` field:** This tells the footer which taxonomy pages belong to this section. When viewing `/news_categories/` or `/news_tags/`, the footer will show "Latest News" recent posts instead of defaulting to blogs.
Use same in archetypes/template is a must.

> ⚠️ **Important:** If you don't add your section to `contentSections`, the footer will fall back to showing "Recent Blogs" instead of your section's posts. This can be intentional for [unlisted/secret sections](#creating-an-unlisted-secret-section).

#### 1b. Add to Navigation Menu

**Why:** Makes the section accessible from the main navigation bar.

**What it does:** Adds a "News" link in the header that takes users to `/news`.

```yaml
Menus:
  main:
    - identifier: news
      name: News
      url: /news
      weight: 4
```

#### 1c. Add Taxonomies (Optional)

**Why:** Creates separate categories/tags for news that won't mix with blogs or opinions.

**What it does:** News posts can have `news_categories: ["breaking"]` without affecting blog categories.

```yaml
taxonomies:
  news_tag: news_tags
  news_category: news_categories
```

---

### Step 2: Create Content Directory

**Why:** Hugo needs a folder to store the news posts.

**What it does:** Creates the `/news` URL and houses all news markdown files.

```bash
mkdir content/news
```

#### Create Index File

**Why:** Sets the page title for the news list page.

**What it does:** When visiting `/news`, the page will show "News" as the header.

Create `content/news/_index.md`:

```markdown
---
title: "News"
---
```

---

### Step 3: Create Archetype

**Why:** Provides a template for new posts with correct front matter fields.

**What it does:** When you run `hugo new news/post.md`, it auto-populates the correct fields.

Create `archetypes/news.md`:

```markdown
---
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: '{{ .Date }}'
draft: false
author: 'Jairaj Kumar'
news_categories: []
news_tags: []
description: ''
toc: true
slug: '{{ .File.ContentBaseName }}'
---
```

---

### Step 4: Create New Posts

**Why:** Now you can easily create properly-formatted news posts.

**What it does:** Creates a new file with all the correct front matter already filled in.

```bash
hugo new news/my-first-news.md
```

---

## Quick Reference

| Section | Content Dir | Archetype | Categories Field |
|---------|-------------|-----------|------------------|
| Blogs | `content/blogs/` | `archetypes/blogs.md` | `categories` |
| Opinions | `content/opinions/` | `archetypes/opinions.md` | `opinion_categories` |
| News | `content/news/` | `archetypes/news.md` | `news_categories` |

---

## Adding a Post to Featured Section

Posts from **any section** can appear in the homepage Featured section.

**Required front matter:**

```yaml
categories: ["featured"]
featured: 5  # Higher number = appears first on homepage
```

**Note:** The `featured` number is **only used for homepage ordering**. On the `/categories/featured/` page, all featured posts are shown sorted by this value.

**Example:** Adding an opinion to featured:

```yaml
---
title: 'My Opinion Post'
opinion_categories: ["thoughts"]
opinion_tags: ["design"]
categories: ["featured"]   # Add to featured
featured: 5                 # Homepage order (higher = first)
---
```

---

## Creating an Unlisted (Secret) Section

Use this when you want posts that are **only accessible via direct link** - great for sharing specific content privately without exposing other posts in the same section.

### What "Unlisted" Means

| Item | Behavior |
|------|----------|
| Section list page (`/section-name/`) | ❌ Returns 404 |
| Individual posts (`/section-name/post/`) | ✅ Accessible via direct link |
| "Recent Posts" in footer | ❌ Never shows posts from this section |
| Menu navigation | ❌ No link in menu |
| Search | ❌ Can be excluded (optional) |

### Example: Making `/opinions` Unlisted

#### Step 1: Mark Section as Draft

Edit `content/opinions/_index.md`:

```yaml
---
title: "Opinions"
draft: true
---
```

> **What this does:** The URL `/opinions/` will return 404. Individual posts remain accessible.

#### Step 2: Remove from `contentSections`

In `hugo.yaml`, comment out or remove the section from `contentSections`:

```yaml
params:
  contentSections:
    blogs:
      recentTitle: "Recent Posts"
      viewAllText: "View All Blogs"
      taxonomies: ["categories", "tags"]
    # opinions:                              # ← Comment out or remove
    #   recentTitle: "Recent Opinions"
    #   viewAllText: "View All Opinions"
    #   taxonomies: ["opinion_categories", "opinion_tags"]
```

> **What this does:** "Recent Opinions" will never appear in the footer. When viewing an opinion post, the footer falls back to showing "Recent Posts" (blogs) instead.

#### Step 3: Ensure Menu Link is Removed

In `hugo.yaml`, make sure the section is not in the menu:

```yaml
Menus:
  main:
    - identifier: blog
      name: Blogs
      url: /blogs
      weight: 1
    # - identifier: opinions  # ← Keep this commented out
    #   name: Opinions
    #   url: /opinions
    #   weight: 2
```

#### Step 4 (Optional): Exclude from Search

Add this to individual posts to exclude from search:

```yaml
---
title: 'My Secret Opinion'
draft: false
excludeFromSearch: true   # ← Excludes from site search
---
```

### Summary: Unlisted Section Checklist

| Step | Location | Change |
|------|----------|--------|
| 1 | `content/section/_index.md` | Add `draft: true` |
| 2 | `hugo.yaml` | Remove section from `contentSections` |
| 3 | `hugo.yaml` | Remove/comment section from `Menus.main` |
| 4 | Individual posts (optional) | Add `excludeFromSearch: true` |

### How It Works Internally

```
┌─────────────────────────────────────────────────────────────────┐
│  User visits /opinions/my-secret-post/                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Post is visible (draft: false on the post itself)           │
│                                                                  │
│  2. Footer template looks for "opinions" in contentSections     │
│     → Not found!                                                 │
│                                                                  │
│  3. Falls back to footer.recentPosts.path → "blogs"             │
│                                                                  │
│  4. Shows "Recent Posts" from blogs section                     │
│     → No opinions exposed!                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Important Notes

> ⚠️ **Posts are still public!** Anyone with the direct link can access them. This is "security through obscurity" - suitable for non-sensitive content you just don't want discoverable.

> 💡 **Cascade warning:** Do NOT use `cascade: draft: true` in `_index.md` - this will hide all individual posts too!

```yaml
# ❌ DON'T DO THIS (hides all posts)
---
title: "Opinions"
draft: true
cascade:
  draft: true
---

# ✅ DO THIS (only hides section listing)
---
title: "Opinions"
draft: true
---
```
