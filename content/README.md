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
Use same in archtypes/template is must

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
