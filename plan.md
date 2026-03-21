

# 🚀 MADVERSE — Full-Scale Application Architecture & JSON Prompt

Below is a **production-grade JSON system prompt** and architectural blueprint covering all four modules. This is designed to be fed directly into an AI code-generation pipeline or used as a living spec document.

---

## The Master JSON Prompt

```json
{
  "application": {
    "name": "MADVERSE",
    "version": "2.0.0",
    "tagline": "Your AI-Powered Second Brain — News, Knowledge, Finance & Intelligence",
    "description": "A unified personal productivity super-app combining personalized news curation, a Notion-level knowledge base, full-spectrum finance management, and a multi-model AI assistant — all deeply interconnected through contextual AI.",
    "design_philosophy": {
      "core_principles": [
        "Every module is interconnected — AI sees everything, suggests everywhere",
        "Local-first with cloud sync — works offline, syncs when online",
        "Progressive disclosure — simple surface, infinite depth",
        "Command-palette driven — keyboard-first, mouse-friendly",
        "Context-aware — the app knows what you're working on and adapts"
      ],
      "inspiration_sources": [
        "Notion — block-based content, databases, relations",
        "Perplexity — AI-powered search and finance insights",
        "Arc Browser — command bar, spaces, splits",
        "Linear — buttery smooth UI, keyboard shortcuts",
        "Obsidian — graph view, local-first, linking",
        "Postman — AI assistant integration pattern",
        "Raycast — command palette, extensions, AI",
        "Coda — formula-powered documents"
      ]
    }
  },

  "tech_stack": {
    "frontend": {
      "framework": "Next.js 14+ (App Router)",
      "ui_library": "React 18+ with Server Components",
      "styling": "Tailwind CSS + Radix UI Primitives + Framer Motion",
      "state_management": "Zustand (global) + TanStack Query (server state) + Jotai (atomic)",
      "editor": "TipTap (ProseMirror) for rich block-based editing",
      "charts": "Recharts + D3.js for finance visualizations",
      "drag_and_drop": "dnd-kit for kanban, sortable lists",
      "real_time": "Socket.io or Ably for live collaboration",
      "offline": "Service Workers + IndexedDB via Dexie.js"
    },
    "backend": {
      "runtime": "Node.js 20+ with Express/Fastify OR Next.js API Routes",
      "api_style": "REST + tRPC for type-safe internal APIs",
      "database": {
        "primary": "PostgreSQL 16+ (via Supabase or Neon)",
        "document_store": "MongoDB (for flexible knowledge base blocks)",
        "cache": "Redis (for sessions, rate limiting, feed caching)",
        "search": "Meilisearch or Typesense (full-text search across all modules)",
        "vector_db": "Pinecone or Qdrant (for AI semantic search & RAG)"
      },
      "auth": "NextAuth.js v5 or Clerk (OAuth, Magic Links, Passkeys)",
      "file_storage": "AWS S3 / Cloudflare R2 with presigned URLs",
      "job_queue": "BullMQ (Redis-backed) for background tasks",
      "ai_gateway": "Custom proxy layer for multi-model routing"
    },
    "infrastructure": {
      "hosting": "Vercel (frontend) + Railway/Fly.io (backend services)",
      "ci_cd": "GitHub Actions",
      "monitoring": "Sentry (errors) + PostHog (analytics) + Upstash (rate limiting)",
      "containerization": "Docker + Docker Compose for local dev"
    }
  },

  "global_ui_ux": {
    "layout": {
      "type": "sidebar_with_panels",
      "description": "Left sidebar (collapsible, 240px) with module navigation, main content area with split-view support, right panel (contextual AI assistant, slideover)",
      "structure": {
        "sidebar": {
          "sections": [
            {
              "label": "Quick Actions",
              "items": ["Search (⌘K)", "New Page (⌘N)", "Quick Capture (⌘⇧C)"]
            },
            {
              "label": "Modules",
              "items": [
                {"icon": "newspaper", "label": "News Feed", "path": "/news"},
                {"icon": "brain", "label": "Knowledge Base", "path": "/kb"},
                {"icon": "wallet", "label": "Finance", "path": "/finance"},
                {"icon": "sparkles", "label": "Maddy AI", "path": "/ai"}
              ]
            },
            {
              "label": "Favorites",
              "items": "dynamic — user-pinned pages from any module"
            },
            {
              "label": "Recent",
              "items": "dynamic — last 10 visited pages"
            }
          ]
        },
        "command_palette": {
          "trigger": "⌘K or /",
          "capabilities": [
            "Search across all modules simultaneously",
            "Quick actions (create task, log expense, ask AI)",
            "Navigate to any page",
            "Run AI commands inline",
            "Switch between AI models"
          ]
        },
        "ai_panel": {
          "trigger": "⌘J or floating button",
          "position": "right slideover panel (400px) or inline in content",
          "persistence": "conversation history maintained per context"
        }
      }
    },
    "theme": {
      "modes": ["light", "dark", "auto (system)"],
      "accent_colors": "user-selectable (8 presets + custom)",
      "typography": {
        "font_family": "Inter (UI) + JetBrains Mono (code)",
        "scale": "modular scale 1.2 ratio"
      },
      "animations": {
        "philosophy": "purposeful micro-interactions, never decorative",
        "library": "Framer Motion with shared layout animations",
        "examples": [
          "Smooth page transitions (slide + fade)",
          "Skeleton loaders for async content",
          "Spring animations for drag-and-drop",
          "Subtle hover states on all interactive elements"
        ]
      }
    },
    "responsive": {
      "breakpoints": {
        "mobile": "< 768px — bottom tab navigation, full-screen views",
        "tablet": "768-1024px — collapsible sidebar, single panel",
        "desktop": "1024-1440px — sidebar + main content",
        "wide": "> 1440px — sidebar + main + AI panel simultaneously"
      }
    },
    "accessibility": {
      "standards": "WCAG 2.1 AA",
      "features": [
        "Full keyboard navigation",
        "Screen reader optimized",
        "Focus indicators on all interactive elements",
        "Reduced motion support",
        "High contrast mode"
      ]
    }
  },

  "modules": {

    "news": {
      "module_id": "news",
      "name": "News Feed",
      "icon": "newspaper",
      "description": "AI-curated personalized news feed covering AI/ML, IT, productivity, tech industry, and must-know current events — with smart summarization and relevance scoring.",

      "features": {
        "feed_types": [
          {
            "id": "for_you",
            "name": "For You",
            "description": "AI-personalized feed based on interests, reading history, and behavior",
            "algorithm": "Hybrid: collaborative filtering + content-based + recency + importance scoring"
          },
          {
            "id": "ai_ml",
            "name": "AI & ML",
            "description": "Latest in artificial intelligence, machine learning, LLMs, research papers",
            "sources": ["arxiv", "huggingface_blog", "openai_blog", "google_ai_blog", "techcrunch_ai", "the_verge_ai", "ars_technica", "hacker_news"]
          },
          {
            "id": "tech_it",
            "name": "Tech & IT",
            "description": "Software engineering, DevOps, cloud, cybersecurity, infrastructure",
            "sources": ["hacker_news", "dev_to", "techcrunch", "the_verge", "wired", "arstechnica"]
          },
          {
            "id": "productivity",
            "name": "Productivity",
            "description": "Tools, techniques, workflows, life hacks, automation tips",
            "sources": ["product_hunt", "indie_hackers", "lifehacker", "zapier_blog", "notion_blog"]
          },
          {
            "id": "must_know",
            "name": "Must Know",
            "description": "Critical news you shouldn't miss — major tech releases, security advisories, industry shifts",
            "algorithm": "AI importance scoring > 0.85 threshold + breaking news detection"
          },
          {
            "id": "custom",
            "name": "Custom Feeds",
            "description": "User-created feeds with custom source combinations and keyword filters"
          }
        ],

        "article_features": {
          "ai_summary": {
            "description": "Every article gets an AI-generated 3-sentence summary",
            "levels": ["headline (1 line)", "brief (3 sentences)", "detailed (1 paragraph)", "full analysis"],
            "model": "configurable — default: fast model for summaries"
          },
          "relevance_score": {
            "description": "0-100 score showing how relevant this article is to the user",
            "factors": ["topic_match", "source_trust", "recency", "reading_history_similarity", "community_engagement"]
          },
          "reading_time": "estimated minutes to read",
          "sentiment": "positive / neutral / negative / mixed",
          "key_takeaways": "AI-extracted bullet points of main insights",
          "related_from_kb": "links to related items in user's Knowledge Base",
          "save_actions": [
            "Save to Reading List",
            "Save to Knowledge Base (creates a new page with metadata)",
            "Share",
            "Create task from article (e.g., 'Explore tool X mentioned here')"
          ]
        },

        "daily_digest": {
          "description": "AI-compiled daily briefing of top 10-15 stories",
          "delivery": ["in-app notification", "email (optional)", "widget on dashboard"],
          "format": "structured briefing with sections: AI News, Tech Updates, Must-Know, Productivity Tip of the Day",
          "timing": "configurable — default 8:00 AM user timezone"
        },

        "smart_features": {
          "duplicate_detection": "AI detects same story from multiple sources, groups them",
          "trend_detection": "identifies emerging topics before they peak",
          "source_credibility": "rates source reliability, flags potential misinformation",
          "reading_analytics": {
            "metrics": ["articles_read_per_day", "topics_distribution", "average_read_time", "reading_streak"],
            "insights": "weekly summary of reading patterns with suggestions"
          }
        },

        "ui_layout": {
          "views": [
            {
              "name": "Card Grid",
              "description": "Pinterest-style masonry grid with article cards showing thumbnail, title, summary, source, time, relevance score",
              "default_for": "desktop"
            },
            {
              "name": "List View",
              "description": "Compact list with title, source, time, relevance badge — Hacker News style",
              "default_for": "power_users"
            },
            {
              "name": "Magazine",
              "description": "Featured article hero + grid below — Apple News style",
              "default_for": "casual_browsing"
            },
            {
              "name": "Timeline",
              "description": "Chronological stream — Twitter/X style",
              "default_for": "mobile"
            }
          ],
          "article_reader": {
            "type": "side panel or full page (user preference)",
            "features": ["clean reader mode", "adjustable font size", "highlight & annotate", "text-to-speech", "AI chat about article"]
          }
        }
      },

      "data_model": {
        "Article": {
          "id": "uuid",
          "source_id": "string",
          "source_name": "string",
          "source_url": "url",
          "title": "string",
          "content": "text",
          "summary_short": "string",
          "summary_detailed": "text",
          "key_takeaways": "string[]",
          "thumbnail_url": "url | null",
          "author": "string | null",
          "published_at": "datetime",
          "fetched_at": "datetime",
          "category": "enum[ai_ml, tech_it, productivity, must_know, general]",
          "tags": "string[]",
          "relevance_score": "float (0-1)",
          "sentiment": "enum[positive, neutral, negative, mixed]",
          "reading_time_minutes": "integer",
          "engagement_score": "float",
          "is_breaking": "boolean",
          "duplicate_group_id": "uuid | null"
        },
        "UserArticleInteraction": {
          "user_id": "uuid",
          "article_id": "uuid",
          "status": "enum[unseen, seen, reading, read, saved, archived]",
          "reading_progress": "float (0-1)",
          "time_spent_seconds": "integer",
          "saved_to_kb": "boolean",
          "kb_page_id": "uuid | null",
          "reaction": "enum[none, like, love, insightful, not_relevant]",
          "highlights": "json[]",
          "notes": "text | null",
          "interacted_at": "datetime"
        },
        "NewsSource": {
          "id": "uuid",
          "name": "string",
          "url": "url",
          "rss_feed_url": "url | null",
          "api_endpoint": "url | null",
          "category": "string",
          "credibility_score": "float (0-1)",
          "is_active": "boolean",
          "fetch_frequency_minutes": "integer",
          "last_fetched_at": "datetime"
        },
        "UserNewsPreference": {
          "user_id": "uuid",
          "preferred_categories": "string[]",
          "preferred_sources": "uuid[]",
          "blocked_sources": "uuid[]",
          "keyword_interests": "string[]",
          "keyword_blocks": "string[]",
          "digest_enabled": "boolean",
          "digest_time": "time",
          "digest_email": "boolean"
        }
      },

      "api_endpoints": [
        "GET /api/news/feed?type={for_you|ai_ml|tech_it|productivity|must_know}&cursor={cursor}&limit={20}",
        "GET /api/news/article/{id}",
        "GET /api/news/article/{id}/summary?level={brief|detailed|full}",
        "POST /api/news/article/{id}/interact — {action: read|save|react|highlight}",
        "GET /api/news/digest?date={date}",
        "GET /api/news/trending",
        "GET /api/news/search?q={query}&filters={...}",
        "GET /api/news/analytics — reading stats",
        "PUT /api/news/preferences — update feed preferences",
        "POST /api/news/sources — add custom RSS/source",
        "POST /api/news/feeds — create custom feed"
      ],

      "background_jobs": [
        "fetch_news_sources — every 15 min, fetches new articles from all active sources",
        "generate_summaries — processes new articles through AI summarization pipeline",
        "compute_relevance — recalculates relevance scores based on user behavior",
        "compile_digest — daily at user-configured time",
        "detect_duplicates — groups similar articles",
        "detect_trends — hourly trend analysis",
        "cleanup_old_articles — archive articles older than 90 days"
      ]
    },

    "knowledge_base": {
      "module_id": "kb",
      "name": "Knowledge Base",
      "icon": "brain",
      "description": "A Notion-inspired personal workspace with block-based editing, databases, project management, AI tool tracking, notes, wikis, and full relational data modeling — enhanced with AI-powered features unique to MADVERSE.",

      "features": {
        "pages_and_blocks": {
          "description": "Everything is a page. Pages contain blocks. Blocks are the atomic unit of content.",
          "page_types": [
            {
              "type": "document",
              "description": "Free-form rich document with nested blocks — like Notion pages",
              "icon": "file-text"
            },
            {
              "type": "database",
              "description": "Structured data with properties, views, filters, sorts — like Notion databases",
              "icon": "table"
            },
            {
              "type": "canvas",
              "description": "Infinite whiteboard for visual thinking, mind maps, diagrams",
              "icon": "layout"
            },
            {
              "type": "dashboard",
              "description": "Custom dashboard with widgets pulling from any database or module",
              "icon": "grid"
            }
          ],
          "block_types": [
            {"type": "text", "description": "Rich text with inline formatting"},
            {"type": "heading", "levels": [1, 2, 3], "description": "Section headings with auto-TOC"},
            {"type": "todo", "description": "Checkbox with due date, assignee, priority"},
            {"type": "bulleted_list", "description": "Unordered list with nesting"},
            {"type": "numbered_list", "description": "Ordered list with nesting"},
            {"type": "toggle", "description": "Collapsible content block"},
            {"type": "quote", "description": "Blockquote with attribution"},
            {"type": "callout", "description": "Colored callout box with icon"},
            {"type": "code", "description": "Syntax-highlighted code block with 50+ languages"},
            {"type": "math", "description": "LaTeX math equations (KaTeX)"},
            {"type": "table", "description": "Simple table (not database)"},
            {"type": "divider", "description": "Horizontal rule"},
            {"type": "image", "description": "Image with caption, resize, alignment"},
            {"type": "video", "description": "Embedded or uploaded video"},
            {"type": "file", "description": "File attachment"},
            {"type": "bookmark", "description": "Rich link preview with metadata"},
            {"type": "embed", "description": "Embed external content (YouTube, Figma, CodePen, etc.)"},
            {"type": "database_inline", "description": "Inline database view within a page"},
            {"type": "linked_database", "description": "View of another database with custom filters"},
            {"type": "synced_block", "description": "Block that syncs across multiple pages"},
            {"type": "column_layout", "description": "Multi-column layout (2, 3, 4 columns)"},
            {"type": "ai_block", "description": "AI-generated content block that can auto-update"},
            {"type": "chart", "description": "Chart/graph pulling data from a database"},
            {"type": "mermaid", "description": "Mermaid diagram (flowcharts, sequence diagrams)"},
            {"type": "excalidraw", "description": "Hand-drawn style diagrams"},
            {"type": "progress_bar", "description": "Visual progress indicator linked to tasks"},
            {"type": "button", "description": "Action button (create page, run automation, etc.)"},
            {"type": "breadcrumb", "description": "Page hierarchy breadcrumb"},
            {"type": "table_of_contents", "description": "Auto-generated from headings"}
          ],
          "block_actions": [
            "drag to reorder",
            "indent/outdent (Tab/Shift+Tab)",
            "turn into (convert block type)",
            "duplicate",
            "delete",
            "color / background color",
            "comment on block",
            "AI actions (rewrite, expand, summarize, translate, explain)",
            "copy link to block",
            "move to page"
          ],
          "slash_commands": {
            "trigger": "/",
            "description": "Type / to see all block types and actions",
            "ai_commands": [
              "/ai write — generate content based on prompt",
              "/ai summarize — summarize selected content",
              "/ai expand — expand on selected content",
              "/ai translate — translate to specified language",
              "/ai explain — explain selected content simply",
              "/ai code — generate code from description",
              "/ai table — generate table from description",
              "/ai brainstorm — generate ideas about topic",
              "/ai action-items — extract action items from text",
              "/ai fix — fix grammar and spelling"
            ]
          }
        },

        "databases": {
          "description": "Powerful structured data system like Notion databases with relations and rollups",
          "property_types": [
            {"type": "title", "description": "Primary field — page title"},
            {"type": "text", "description": "Plain or rich text"},
            {"type": "number", "description": "Number with format (plain, currency, percent, etc.)"},
            {"type": "select", "description": "Single select from options with colors"},
            {"type": "multi_select", "description": "Multiple selections with colors and tags"},
            {"type": "status", "description": "Kanban-style status (Not Started → In Progress → Done)"},
            {"type": "date", "description": "Date or date range with reminders"},
            {"type": "person", "description": "User reference (for multi-user scenarios)"},
            {"type": "files", "description": "File attachments"},
            {"type": "checkbox", "description": "Boolean true/false"},
            {"type": "url", "description": "URL with validation"},
            {"type": "email", "description": "Email with validation"},
            {"type": "phone", "description": "Phone number"},
            {"type": "formula", "description": "Computed field using formula language"},
            {"type": "relation", "description": "Link to entries in another database"},
            {"type": "rollup", "description": "Aggregate data from related entries (count, sum, avg, etc.)"},
            {"type": "created_time", "description": "Auto — when entry was created"},
            {"type": "created_by", "description": "Auto — who created the entry"},
            {"type": "last_edited_time", "description": "Auto — last modification time"},
            {"type": "last_edited_by", "description": "Auto — who last modified"},
            {"type": "auto_increment", "description": "Auto-incrementing ID"},
            {"type": "ai_summary", "description": "AI-generated summary of the page content"},
            {"type": "ai_tags", "description": "AI-auto-generated tags based on content"},
            {"type": "rating", "description": "1-5 star rating"},
            {"type": "progress", "description": "Progress percentage (manual or computed from sub-tasks)"}
          ],
          "views": [
            {
              "type": "table",
              "description": "Spreadsheet-style view with sortable, filterable, resizable columns",
              "features": ["column resize", "column reorder", "row grouping", "sub-totals", "frozen columns", "wrap/truncate toggle"]
            },
            {
              "type": "board",
              "description": "Kanban board grouped by any select/status property",
              "features": ["drag between columns", "column WIP limits", "card customization", "swimlanes"]
            },
            {
              "type": "list",
              "description": "Compact list view — one line per entry",
              "features": ["toggleable properties", "inline editing"]
            },
            {
              "type": "calendar",
              "description": "Calendar view based on date properties",
              "features": ["month/week/day views", "drag to reschedule", "multi-day events"]
            },
            {
              "type": "timeline",
              "description": "Gantt-style timeline view based on date ranges",
              "features": ["dependency arrows", "drag to adjust dates", "zoom levels"]
            },
            {
              "type": "gallery",
              "description": "Card grid with cover images",
              "features": ["card size options", "custom card content"]
            },
            {
              "type": "chart",
              "description": "Data visualization — bar, line, pie, scatter from database properties",
              "features": ["multiple chart types", "custom colors", "aggregate functions"]
            },
            {
              "type": "form",
              "description": "Form view for data entry — shareable",
              "features": ["field visibility", "required fields", "conditional logic", "thank you page"]
            }
          ],
          "filters": {
            "description": "Advanced filtering system",
            "operators": ["is", "is_not", "contains", "does_not_contain", "starts_with", "ends_with", "is_empty", "is_not_empty", "greater_than", "less_than", "between", "relative_date (today, this_week, last_7_days, etc.)"],
            "logic": "AND / OR groups with nesting",
            "saved_filters": "name and save filter combinations as views"
          },
          "sorts": {
            "multi_level": true,
            "direction": ["ascending", "descending"],
            "max_levels": 5
          }
        },

        "pre_built_templates": {
          "description": "Ready-to-use database templates for common use cases",
          "templates": [
            {
              "name": "AI Tools Tracker",
              "description": "Track AI tools you use, want to explore, or are reviewing",
              "properties": [
                {"name": "Tool Name", "type": "title"},
                {"name": "Category", "type": "select", "options": ["Writing", "Coding", "Image Gen", "Video", "Audio", "Research", "Automation", "Data", "Other"]},
                {"name": "Status", "type": "status", "options": ["To Explore", "Exploring", "In Use", "Discontinued", "Rejected"]},
                {"name": "Rating", "type": "rating"},
                {"name": "Pricing", "type": "select", "options": ["Free", "Freemium", "Paid", "Enterprise"]},
                {"name": "Monthly Cost", "type": "number", "format": "currency"},
                {"name": "URL", "type": "url"},
                {"name": "Use Case", "type": "text"},
                {"name": "Pros", "type": "text"},
                {"name": "Cons", "type": "text"},
                {"name": "Alternatives", "type": "relation", "self_relation": true},
                {"name": "Notes", "type": "text"},
                {"name": "Last Reviewed", "type": "date"},
                {"name": "AI Tags", "type": "ai_tags"}
              ]
            },
            {
              "name": "Productivity Tools",
              "description": "All productivity tools and apps in your workflow",
              "properties": [
                {"name": "Tool Name", "type": "title"},
                {"name": "Category", "type": "select", "options": ["Note-taking", "Task Management", "Communication", "Design", "Development", "Browser Extension", "Automation", "Other"]},
                {"name": "Platform", "type": "multi_select", "options": ["Web", "macOS", "Windows", "Linux", "iOS", "Android", "Chrome Extension"]},
                {"name": "Status", "type": "status", "options": ["Active", "Trial", "Wishlist", "Archived"]},
                {"name": "Integrates With", "type": "relation"},
                {"name": "Cost", "type": "number", "format": "currency"},
                {"name": "Billing", "type": "select", "options": ["Monthly", "Yearly", "One-time", "Free"]},
                {"name": "Rating", "type": "rating"},
                {"name": "Review Notes", "type": "text"},
                {"name": "URL", "type": "url"}
              ]
            },
            {
              "name": "Project Hub",
              "description": "Manage projects with full lifecycle tracking",
              "properties": [
                {"name": "Project Name", "type": "title"},
                {"name": "Status", "type": "status", "options": ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"]},
                {"name": "Priority", "type": "select", "options": ["🔴 Urgent", "🟠 High", "🟡 Medium", "🟢 Low"]},
                {"name": "Start Date", "type": "date"},
                {"name": "Deadline", "type": "date"},
                {"name": "Progress", "type": "progress"},
                {"name": "Tasks", "type": "relation", "related_db": "Tasks"},
                {"name": "Client/Team", "type": "text"},
                {"name": "Description", "type": "text"},
                {"name": "Tech Stack", "type": "multi_select"},
                {"name": "Repository", "type": "url"},
                {"name": "Documents", "type": "files"},
                {"name": "Budget", "type": "number", "format": "currency"},
                {"name": "Spent", "type": "rollup", "config": {"relation": "Tasks", "property": "Cost", "function": "sum"}},
                {"name": "Tags", "type": "multi_select"}
              ]
            },
            {
              "name": "Tasks",
              "description": "Task management with priorities, deadlines, and project linking",
              "properties": [
                {"name": "Task", "type": "title"},
                {"name": "Status", "type": "status", "options": ["Backlog", "To Do", "In Progress", "In Review", "Done", "Blocked"]},
                {"name": "Priority", "type": "select", "options": ["🔴 P0 - Critical", "🟠 P1 - High", "🟡 P2 - Medium", "🟢 P3 - Low"]},
                {"name": "Project", "type": "relation", "related_db": "Project Hub"},
                {"name": "Due Date", "type": "date"},
                {"name": "Estimated Hours", "type": "number"},
                {"name": "Actual Hours", "type": "number"},
                {"name": "Tags", "type": "multi_select"},
                {"name": "Dependencies", "type": "relation", "self_relation": true},
                {"name": "Assigned To", "type": "person"},
                {"name": "Sprint", "type": "select"},
                {"name": "Cost", "type": "number", "format": "currency"},
                {"name": "Subtasks", "type": "relation", "self_relation": true},
                {"name": "Notes", "type": "text"}
              ]
            },
            {
              "name": "Life Hacks & Tips",
              "description": "Collection of useful life hacks, shortcuts, and tips",
              "properties": [
                {"name": "Title", "type": "title"},
                {"name": "Category", "type": "select", "options": ["Tech Hack", "Productivity", "Health", "Finance", "Cooking", "Travel", "Learning", "Other"]},
                {"name": "Source", "type": "url"},
                {"name": "Difficulty", "type": "select", "options": ["Easy", "Medium", "Hard"]},
                {"name": "Impact", "type": "select", "options": ["Life-changing", "Very Useful", "Nice to Know"]},
                {"name": "Tried", "type": "checkbox"},
                {"name": "Rating", "type": "rating"},
                {"name": "Tags", "type": "multi_select"},
                {"name": "Notes", "type": "text"}
              ]
            },
            {
              "name": "Notes & Journal",
              "description": "Daily notes, journal entries, ideas, meeting notes",
              "properties": [
                {"name": "Title", "type": "title"},
                {"name": "Type", "type": "select", "options": ["Daily Note", "Journal", "Meeting Notes", "Idea", "Research", "Brain Dump", "Reflection"]},
                {"name": "Date", "type": "date"},
                {"name": "Tags", "type": "multi_select"},
                {"name": "Mood", "type": "select", "options": ["😊 Great", "🙂 Good", "😐 Okay", "😔 Low", "😤 Frustrated"]},
                {"name": "Related Project", "type": "relation", "related_db": "Project Hub"},
                {"name": "AI Summary", "type": "ai_summary"},
                {"name": "Word Count", "type": "formula", "formula": "length(content)"}
              ]
            }
          ]
        },

        "workspace_features": {
          "page_hierarchy": {
            "description": "Infinite nesting — pages within pages",
            "features": ["breadcrumb navigation", "sidebar tree view", "move page (drag or command)", "page history (version control)"]
          },
          "bi_directional_links": {
            "description": "Link any page to any other page using [[page name]] syntax",
            "features": ["autocomplete suggestions", "backlinks section on every page", "unlinked mentions detection"]
          },
          "graph_view": {
            "description": "Visual graph of all page connections — Obsidian-style",
            "features": ["zoom and pan", "filter by database/tag", "cluster detection", "force-directed layout"]
          },
          "templates": {
            "description": "Create and use page/database templates",
            "features": ["template gallery", "create from template", "template variables (date, time, etc.)", "community templates"]
          },
          "version_history": {
            "description": "Full version history of every page",
            "features": ["view past versions", "restore any version", "diff view", "auto-save every 30 seconds"]
          },
          "import_export": {
            "import_from": ["Notion (API)", "Markdown files", "CSV", "JSON", "HTML", "Evernote (ENEX)", "Google Docs"],
            "export_to": ["Markdown", "PDF", "HTML", "CSV", "JSON", "Notion (API)"]
          },
          "search": {
            "description": "Instant full-text search across all KB content",
            "features": ["fuzzy matching", "filter by database/page type/date", "search within page", "regex search", "AI semantic search (find conceptually similar content)"]
          },
          "ai_features": {
            "auto_tagging": "AI suggests tags based on content",
            "auto_linking": "AI suggests related pages to link",
            "smart_summaries": "AI generates summary for long pages",
            "content_suggestions": "AI suggests what to add based on context",
            "duplicate_detection": "AI finds similar/duplicate pages",
            "q_and_a": "Ask questions about your entire knowledge base using RAG",
            "writing_assistant": "Inline AI writing assistance (grammar, style, expansion, rewriting)"
          }
        },

        "ui_layout": {
          "sidebar_tree": "Hierarchical page tree with expand/collapse, drag-to-reorder, right-click context menu",
          "breadcrumb": "Top breadcrumb showing page hierarchy path",
          "page_header": {
            "components": ["icon (emoji or uploaded)", "cover image (unsplash or upload)", "title (editable)", "properties (if database entry)", "description"]
          },
          "content_area": {
            "max_width": "720px centered (configurable: full-width toggle)",
            "features": ["focus mode (dims everything except content)", "word count", "reading time", "last edited indicator"]
          },
          "right_sidebar": {
            "tabs": ["AI Assistant", "Backlinks", "Comments", "Page History", "Properties"],
            "collapsible": true
          }
        }
      },

      "data_model": {
        "Page": {
          "id": "uuid",
          "workspace_id": "uuid",
          "parent_id": "uuid | null",
          "type": "enum[document, database, canvas, dashboard]",
          "title": "string",
          "icon": "string (emoji or url)",
          "cover_url": "url | null",
          "content_blocks": "json (ordered array of block objects)",
          "properties": "json (for database entries — key-value of property_id: value)",
          "is_template": "boolean",
          "is_deleted": "boolean",
          "is_archived": "boolean",
          "is_favorited": "boolean",
          "sort_order": "float",
          "created_at": "datetime",
          "updated_at": "datetime",
          "created_by": "uuid",
          "last_edited_by": "uuid",
          "version": "integer",
          "word_count": "integer",
          "ai_summary": "text | null",
          "ai_tags": "string[]",
          "embedding_vector": "float[] (for semantic search)"
        },
        "Block": {
          "id": "uuid",
          "page_id": "uuid",
          "parent_block_id": "uuid | null",
          "type": "string (from block_types enum)",
          "content": "json (type-specific content data)",
          "properties": "json (formatting, colors, etc.)",
          "sort_order": "float",
          "created_at": "datetime",
          "updated_at": "datetime"
        },
        "Database": {
          "id": "uuid",
          "page_id": "uuid (the page that IS the database)",
          "properties_schema": "json (array of property definitions)",
          "views": "json (array of view configurations)",
          "default_view_id": "string"
        },
        "PageLink": {
          "source_page_id": "uuid",
          "target_page_id": "uuid",
          "source_block_id": "uuid",
          "link_type": "enum[mention, relation, backlink]",
          "created_at": "datetime"
        },
        "PageVersion": {
          "id": "uuid",
          "page_id": "uuid",
          "version_number": "integer",
          "content_snapshot": "json",
          "changed_by": "uuid",
          "changed_at": "datetime",
          "change_description": "string | null"
        },
        "Template": {
          "id": "uuid",
          "name": "string",
          "description": "string",
          "category": "string",
          "content": "json (page structure)",
          "is_system": "boolean",
          "usage_count": "integer",
          "created_by": "uuid"
        }
      },

      "api_endpoints": [
        "GET /api/kb/pages?parent_id={id}&sort={field}&filter={json}",
        "GET /api/kb/pages/{id}",
        "POST /api/kb/pages — create page",
        "PATCH /api/kb/pages/{id} — update page",
        "DELETE /api/kb/pages/{id}",
        "POST /api/kb/pages/{id}/duplicate",
        "POST /api/kb/pages/{id}/move — {new_parent_id}",
        "GET /api/kb/pages/{id}/history",
        "POST /api/kb/pages/{id}/restore — {version_id}",
        "GET /api/kb/pages/{id}/backlinks",
        "POST /api/kb/blocks — create block",
        "PATCH /api/kb/blocks/{id} — update block",
        "DELETE /api/kb/blocks/{id}",
        "POST /api/kb/blocks/{id}/move",
        "POST /api/kb/blocks/{id}/convert — {new_type}",
        "GET /api/kb/databases/{id}/entries?view={view_id}&filter={json}&sort={json}&cursor={cursor}",
        "POST /api/kb/databases/{id}/entries",
        "PATCH /api/kb/databases/{id}/entries/{entry_id}",
        "GET /api/kb/search?q={query}&type={semantic|fulltext}&scope={all|database_id}",
        "GET /api/kb/graph — returns nodes and edges for graph view",
        "GET /api/kb/templates",
        "POST /api/kb/templates/{id}/use — create page from template",
        "POST /api/kb/import — {format, file}",
        "GET /api/kb/export/{page_id}?format={md|pdf|html|json}"
      ]
    },

    "finance": {
      "module_id": "finance",
      "name": "Finance",
      "icon": "wallet",
      "description": "Complete personal finance management — income tracking, expense categorization, cash flow analysis, investment portfolio tracking, and AI-powered financial insights and recommendations — inspired by Perplexity Finance, Mint, and YNAB.",

      "features": {
        "dashboard": {
          "description": "At-a-glance financial health overview",
          "widgets": [
            {
              "name": "Net Worth",
              "type": "metric_card",
              "description": "Total assets minus total liabilities with trend line",
              "visualization": "large number + sparkline + percentage change"
            },
            {
              "name": "Monthly Cash Flow",
              "type": "chart",
              "description": "Income vs Expenses bar chart for current month",
              "visualization": "grouped bar chart with net amount"
            },
            {
              "name": "Expense Breakdown",
              "type": "chart",
              "description": "Category-wise expense distribution",
              "visualization": "donut chart with legend"
            },
            {
              "name": "Budget Progress",
              "type": "progress_bars",
              "description": "Each budget category with spent vs allocated",
              "visualization": "horizontal progress bars with color coding"
            },
            {
              "name": "Investment Portfolio",
              "type": "chart",
              "description": "Portfolio value over time with asset allocation",
              "visualization": "area chart + mini pie chart"
            },
            {
              "name": "Recent Transactions",
              "type": "list",
              "description": "Last 10 transactions with quick categorize",
              "visualization": "compact list with icons and amounts"
            },
            {
              "name": "AI Insights",
              "type": "card",
              "description": "AI-generated financial insights and alerts",
              "visualization": "card with icon, insight text, and action button"
            },
            {
              "name": "Upcoming Bills",
              "type": "list",
              "description": "Bills due in next 30 days",
              "visualization": "timeline list with amounts and due dates"
            }
          ]
        },

        "income_tracking": {
          "description": "Track all income sources",
          "features": [
            "Multiple income sources (salary, freelance, investments, side projects, etc.)",
            "Recurring income setup with frequency (monthly, bi-weekly, etc.)",
            "Income history with trends",
            "Tax estimation based on income brackets",
            "Invoice tracking for freelance income",
            "Income goals with progress tracking"
          ]
        },

        "expense_tracking": {
          "description": "Comprehensive expense management",
          "features": [
            "Manual entry with smart defaults",
            "Bulk import from CSV/bank statements",
            "AI auto-categorization of transactions",
            "Receipt scanning (OCR) via phone camera or upload",
            "Recurring expense tracking (subscriptions, rent, EMIs)",
            "Split transactions across categories",
            "Expense tags for additional classification",
            "Merchant tracking and analysis",
            "Currency support for international expenses"
          ],
          "categories": {
            "preset": [
              "🏠 Housing (Rent, Mortgage, Maintenance)",
              "🚗 Transportation (Fuel, Parking, Maintenance, Public Transit)",
              "🍔 Food & Dining (Groceries, Restaurants, Coffee, Delivery)",
              "💡 Utilities (Electricity, Water, Internet, Phone)",
              "🏥 Healthcare (Insurance, Doctor, Pharmacy, Gym)",
              "🎓 Education (Courses, Books, Subscriptions)",
              "🛍️ Shopping (Clothing, Electronics, Home)",
              "🎬 Entertainment (Movies, Games, Streaming, Events)",
              "✈️ Travel (Flights, Hotels, Activities)",
              "💼 Business (Software, Office, Marketing)",
              "🎁 Gifts & Donations",
              "📱 Subscriptions & Software",
              "💳 Debt Payments (Credit Card, Loans)",
              "💰 Savings & Investments",
              "🔧 Miscellaneous"
            ],
            "custom": "user can create custom categories with icons and colors"
          }
        },

        "budgeting": {
          "description": "Budget creation and tracking",
          "methods": [
            {
              "name": "Category Budget",
              "description": "Set monthly budget per expense category"
            },
            {
              "name": "50/30/20 Rule",
              "description": "Auto-split income into Needs(50%), Wants(30%), Savings(20%)"
            },
            {
              "name": "Zero-Based",
              "description": "Every rupee/dollar assigned a job — income minus allocations = 0"
            },
            {
              "name": "Envelope System",
              "description": "Digital envelopes with fixed amounts per category"
            }
          ],
          "features": [
            "Monthly and yearly budget views",
            "Rollover unused budget to next month",
            "Budget alerts at 50%, 75%, 90%, 100% thresholds",
            "AI budget recommendations based on spending patterns",
            "Comparison: budget vs actual with variance analysis"
          ]
        },

        "investments": {
          "description": "Investment portfolio tracking and AI recommendations — inspired by Perplexity Finance",
          "portfolio_tracking": {
            "asset_types": [
              "Stocks (Indian & US markets)",
              "Mutual Funds (SIP & Lumpsum)",
              "ETFs",
              "Fixed Deposits",
              "PPF / NPS / EPF",
              "Gold (Physical & Digital)",
              "Cryptocurrency",
              "Real Estate",
              "Bonds",
              "Other"
            ],
            "features": [
              "Manual entry or API sync with brokerage (future)",
              "Real-time market prices (API: Yahoo Finance / Alpha Vantage / NSE)",
              "Portfolio value over time chart",
              "Asset allocation pie chart",
              "Individual holding performance (P&L, XIRR, CAGR)",
              "Dividend tracking",
              "Capital gains calculation (short-term vs long-term)",
              "Tax harvesting suggestions"
            ]
          },
          "ai_recommendations": {
            "description": "AI-powered investment insights — NOT financial advice, educational only",
            "disclaimer": "All recommendations are AI-generated insights for educational purposes. Not financial advice. Always consult a certified financial advisor.",
            "features": [
              {
                "name": "Market Overview",
                "description": "Daily AI summary of market conditions, sector performance, key events"
              },
              {
                "name": "Watchlist",
                "description": "Track stocks/funds you're interested in with price alerts and AI analysis"
              },
              {
                "name": "Fund Analysis",
                "description": "AI analysis of mutual fund performance, expense ratio, risk metrics, peer comparison"
              },
              {
                "name": "Stock Analysis",
                "description": "AI fundamental and technical analysis summary for individual stocks"
              },
              {
                "name": "Portfolio Rebalancing",
                "description": "AI suggests rebalancing when allocation drifts from targets"
              },
              {
                "name": "Goal-Based Investing",
                "description": "Set financial goals (retirement, house, education) and get AI-suggested investment plans"
              },
              {
                "name": "Risk Assessment",
                "description": "AI evaluates portfolio risk level and suggests adjustments"
              },
              {
                "name": "Trending in Finance",
                "description": "AI-curated finance news relevant to user's portfolio"
              }
            ]
          }
        },

        "cash_flow": {
          "description": "Cash flow analysis and forecasting",
          "features": [
            "Monthly cash flow statement (income - expenses = net)",
            "Cash flow trend over 6/12/24 months",
            "Waterfall chart showing cash flow breakdown",
            "AI cash flow forecasting based on historical patterns",
            "Recurring transaction projection",
            "Surplus/deficit alerts",
            "Savings rate tracking and optimization"
          ]
        },

        "reports_and_analytics": {
          "description": "Detailed financial reports and visualizations",
          "reports": [
            "Monthly/Quarterly/Annual Income Statement",
            "Expense trends by category over time",
            "Year-over-Year comparison",
            "Net worth evolution chart",
            "Savings rate trend",
            "Top spending categories",
            "Subscription cost analysis (total, per category)",
            "Investment returns report",
            "Tax summary report"
          ],
          "chart_types": [
            "Line charts (trends)",
            "Bar charts (comparisons)",
            "Pie/Donut charts (distributions)",
            "Area charts (cumulative)",
            "Waterfall charts (cash flow)",
            "Heatmap (spending by day/week)",
            "Sankey diagram (income flow to expense categories)"
          ]
        },

        "ai_insights": {
          "description": "Proactive AI financial insights",
          "types": [
            "Unusual spending alert — 'You spent 40% more on dining this month'",
            "Savings opportunity — 'Switching from X to Y subscription could save ₹500/month'",
            "Bill reminder — 'Your insurance premium of ₹15,000 is due in 5 days'",
            "Investment opportunity — 'Based on your risk profile, consider SIP in XYZ fund'",
            "Budget tip — 'You consistently underspend on Education. Consider investing in a course'",
            "Milestone alert — 'Congratulations! Your net worth crossed ₹10L'",
            "Trend warning — 'Your monthly expenses have increased 15% over last 3 months'",
            "Tax tip — 'You can save ₹46,800 in taxes by investing ₹1.5L in ELSS'"
          ]
        },

        "ui_layout": {
          "navigation": "Top tabs: Dashboard | Transactions | Budget | Investments | Reports | AI Insights",
          "transactions_view": {
            "type": "table with filters",
            "features": ["search", "date range picker", "category filter", "amount range", "type filter (income/expense)", "export CSV", "bulk categorize"]
          },
          "color_coding": {
            "income": "green shades",
            "expense": "red shades",
            "savings": "blue shades",
            "investment": "purple shades",
            "neutral": "gray"
          }
        }
      },

      "data_model": {
        "Account": {
          "id": "uuid",
          "user_id": "uuid",
          "name": "string (e.g., 'HDFC Savings', 'Cash', 'Credit Card')",
          "type": "enum[savings, checking, credit_card, cash, investment, loan, wallet]",
          "currency": "string (ISO 4217)",
          "balance": "decimal",
          "institution": "string | null",
          "is_active": "boolean",
          "created_at": "datetime"
        },
        "Transaction": {
          "id": "uuid",
          "user_id": "uuid",
          "account_id": "uuid",
          "type": "enum[income, expense, transfer, investment]",
          "amount": "decimal",
          "currency": "string",
          "category_id": "uuid",
          "subcategory": "string | null",
          "merchant": "string | null",
          "description": "string",
          "notes": "text | null",
          "date": "date",
          "time": "time | null",
          "is_recurring": "boolean",
          "recurring_id": "uuid | null",
          "tags": "string[]",
          "receipt_url": "url | null",
          "ai_categorized": "boolean",
          "created_at": "datetime",
          "updated_at": "datetime"
        },
        "Category": {
          "id": "uuid",
          "user_id": "uuid | null (null = system default)",
          "name": "string",
          "icon": "string (emoji)",
          "color": "string (hex)",
          "type": "enum[income, expense]",
          "parent_id": "uuid | null (for subcategories)",
          "budget_amount": "decimal | null",
          "sort_order": "integer"
        },
        "Budget": {
          "id": "uuid",
          "user_id": "uuid",
          "category_id": "uuid",
          "amount": "decimal",
          "period": "enum[monthly, quarterly, yearly]",
          "start_date": "date",
          "rollover": "boolean",
          "alert_thresholds": "integer[] (e.g., [50, 75, 90, 100])"
        },
        "RecurringTransaction": {
          "id": "uuid",
          "user_id": "uuid",
          "template": "json (Transaction template)",
          "frequency": "enum[daily, weekly, bi_weekly, monthly, quarterly, yearly]",
          "start_date": "date",
          "end_date": "date | null",
          "next_occurrence": "date",
          "is_active": "boolean"
        },
        "Investment": {
          "id": "uuid",
          "user_id": "uuid",
          "asset_type": "enum[stock, mutual_fund, etf, fd, ppf, gold, crypto, real_estate, bond, other]",
          "symbol": "string | null",
          "name": "string",
          "quantity": "decimal",
          "buy_price": "decimal",
          "buy_date": "date",
          "current_price": "decimal",
          "current_value": "decimal",
          "returns_absolute": "decimal",
          "returns_percentage": "float",
          "notes": "text | null",
          "platform": "string | null",
          "is_sip": "boolean",
          "sip_amount": "decimal | null",
          "sip_date": "integer | null"
        },
        "Watchlist": {
          "id": "uuid",
          "user_id": "uuid",
          "symbol": "string",
          "name": "string",
          "asset_type": "string",
          "target_price": "decimal | null",
          "alert_enabled": "boolean",
          "notes": "text | null",
          "added_at": "datetime"
        },
        "FinancialGoal": {
          "id": "uuid",
          "user_id": "uuid",
          "name": "string (e.g., 'Emergency Fund', 'House Down Payment')",
          "target_amount": "decimal",
          "current_amount": "decimal",
          "target_date": "date",
          "priority": "enum[high, medium, low]",
          "linked_investments": "uuid[]",
          "strategy": "text | null",
          "created_at": "datetime"
        }
      },

      "api_endpoints": [
        "GET /api/finance/dashboard — aggregated dashboard data",
        "GET /api/finance/accounts",
        "POST /api/finance/accounts",
        "PATCH /api/finance/accounts/{id}",
        "GET /api/finance/transactions?account={id}&category={id}&date_from={date}&date_to={date}&type={type}&cursor={cursor}",
        "POST /api/finance/transactions",
        "PATCH /api/finance/transactions/{id}",
        "DELETE /api/finance/transactions/{id}",
        "POST /api/finance/transactions/bulk — bulk import",
        "POST /api/finance/transactions/{id}/categorize — AI categorization",
        "GET /api/finance/categories",
        "POST /api/finance/categories",
        "GET /api/finance/budgets?period={period}",
        "POST /api/finance/budgets",
        "GET /api/finance/budgets/progress — budget vs actual",
        "GET /api/finance/cashflow?period={monthly|quarterly|yearly}&range={12}",
        "GET /api/finance/investments/portfolio",
        "POST /api/finance/investments",
        "PATCH /api/finance/investments/{id}",
        "GET /api/finance/investments/performance",
        "GET /api/finance/investments/allocation",
        "GET /api/finance/watchlist",
        "POST /api/finance/watchlist",
        "GET /api/finance/market/quote/{symbol}",
        "GET /api/finance/market/overview",
        "GET /api/finance/goals",
        "POST /api/finance/goals",
        "GET /api/finance/reports/{type}?period={period}",
        "GET /api/finance/insights — AI-generated insights",
        "GET /api/finance/recurring",
        "POST /api/finance/recurring",
        "POST /api/finance/receipt/scan — OCR receipt scanning"
      ],

      "external_apis": [
        {"name": "Yahoo Finance API", "purpose": "Stock/fund prices, market data"},
        {"name": "Alpha Vantage", "purpose": "Stock prices, technical indicators"},
        {"name": "NSE India API", "purpose": "Indian stock market data"},
        {"name": "AMFI API", "purpose": "Indian mutual fund NAVs"},
        {"name": "CoinGecko API", "purpose": "Cryptocurrency prices"},
        {"name": "Exchange Rate API", "purpose": "Currency conversion rates"},
        {"name": "Google Vision API / Tesseract", "purpose": "Receipt OCR"}
      ]
    },

    "ai_assistant": {
      "module_id": "ai",
      "name": "Maddy AI",
      "icon": "sparkles",
      "description": "Multi-model AI assistant deeply integrated into every module — supports free models via OpenRouter, paid APIs (Claude, GPT, Gemini), and custom model routing — inspired by Notion AI, Postman AI, Cursor, and ChatGPT.",

      "features": {
        "multi_model_support": {
          "description": "Use any AI model from any provider — free or paid",
          "providers": [
            {
              "name": "OpenRouter",
              "description": "Access to 100+ models including free tier models",
              "free_models": [
                "meta-llama/llama-3.1-8b-instruct:free",
                "google/gemma-2-9b-it:free",
                "mistralai/mistral-7b-instruct:free",
                "microsoft/phi-3-mini-128k-instruct:free",
                "qwen/qwen-2-7b-instruct:free",
                "huggingfaceh4/zephyr-7b-beta:free"
              ],
              "paid_models": [
                "anthropic/claude-3.5-sonnet",
                "openai/gpt-4o",
                "google/gemini-pro-1.5",
                "meta-llama/llama-3.1-405b-instruct"
              ],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "Anthropic (Direct)",
              "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "OpenAI (Direct)",
              "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "Google (Direct)",
              "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "Groq (Free Tier)",
              "models": ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "Together AI",
              "models": ["various open source models"],
              "api_key_storage": "encrypted in user settings"
            },
            {
              "name": "Local Models (Ollama)",
              "description": "Connect to locally running models via Ollama",
              "endpoint": "http://localhost:11434",
              "models": "auto-detected from local Ollama installation"
            }
          ],

          "model_routing": {
            "description": "Smart routing of requests to appropriate models based on task",
            "strategy": {
              "quick_tasks": {
                "tasks": ["grammar fix", "simple Q&A", "categorization", "short summaries"],
                "preferred_model": "fast and cheap (GPT-4o-mini, Haiku, free models)",
                "fallback": "next fastest available model"
              },
              "complex_tasks": {
                "tasks": ["deep analysis", "long-form writing", "code generation", "financial analysis"],
                "preferred_model": "most capable (Claude Sonnet, GPT-4o, Gemini Pro)",
                "fallback": "next most capable available model"
              },
              "creative_tasks": {
                "tasks": ["brainstorming", "content creation", "rewriting"],
                "preferred_model": "user preference or Claude Sonnet",
                "settings": {"temperature": 0.8}
              },
              "code_tasks": {
                "tasks": ["code generation", "debugging", "code review", "explanation"],
                "preferred_model": "Claude Sonnet or GPT-4o",
                "settings": {"temperature": 0.2}
              }
            },
            "user_override": "user can always manually select a specific model for any request"
          }
        },

        "interfaces": {
          "chat_panel": {
            "description": "Persistent sliding panel on the right side — primary AI interaction surface",
            "features": [
              "Full conversation history with search",
              "Context-aware — knows which page/module you're in",
              "File/image upload for analysis",
              "Code execution (sandboxed) for code blocks",
              "Render markdown, tables, charts in responses",
              "Copy, regenerate, edit user messages",
              "Pin important conversations",
              "Export conversation to KB page",
              "Model selector dropdown at top of chat",
              "Token usage indicator",
              "Streaming responses with stop button"
            ]
          },
          "inline_ai": {
            "description": "AI integrated directly into the editor — like Notion AI",
            "triggers": [
              "Select text → AI toolbar appears above selection",
              "Type /ai or press ⌘I for AI actions",
              "Empty line → 'Ask AI to write...' placeholder",
              "Highlight text → right-click → AI actions submenu"
            ],
            "actions": [
              "Continue writing",
              "Rewrite (shorter, longer, simpler, professional, casual)",
              "Fix grammar & spelling",
              "Translate to (language selector)",
              "Summarize selection",
              "Expand on this",
              "Extract action items",
              "Generate from prompt",
              "Explain this",
              "Convert to table",
              "Convert to bullet points",
              "Add examples",
              "Generate code",
              "Generate formula (for database properties)"
            ]
          },
          "command_palette_ai": {
            "description": "AI accessible from the global command palette (⌘K)",
            "commands": [
              "Ask Maddy anything...",
              "Summarize current page",
              "Find related pages in KB",
              "Analyze my spending this month",
              "What's trending in AI news today?",
              "Create a task from...",
              "Generate a report...",
              "Help me plan..."
            ]
          },
          "contextual_ai": {
            "description": "AI that proactively offers help based on context",
            "triggers": [
              "When reading news → 'Want me to summarize this?' | 'Save key takeaways to KB?'",
              "When in finance → 'I noticed unusual spending. Want to analyze?'",
              "When writing → 'Need help continuing this thought?'",
              "When in project → 'You have 3 overdue tasks. Want to reprioritize?'",
              "When idle on dashboard → 'Here's your daily briefing'"
            ]
          }
        },

        "rag_knowledge": {
          "description": "RAG (Retrieval Augmented Generation) over user's entire data",
          "indexed_data": [
            "All Knowledge Base pages and blocks",
            "All financial transaction descriptions and notes",
            "All saved news articles and annotations",
            "All project and task descriptions",
            "All conversations with AI (searchable)"
          ],
          "pipeline": {
            "embedding_model": "text-embedding-3-small (OpenAI) or all-MiniLM-L6-v2 (local)",
            "chunk_strategy": "block-level chunking with overlap",
            "vector_store": "Pinecone / Qdrant / local ChromaDB",
            "retrieval": "hybrid (vector similarity + keyword BM25)",
            "reranking": "Cohere Rerank or cross-encoder",
            "context_window": "dynamic — inject top 5-10 relevant chunks"
          },
          "use_cases": [
            "Q&A over your knowledge base: 'What notes did I take about React Server Components?'",
            "Cross-module insights: 'How much did I spend on AI tools this quarter?' (finance + KB)",
            "Smart suggestions: 'Based on your project notes, you might want to check this article'",
            "Meeting prep: 'Summarize everything related to Project X'"
          ]
        },

        "ai_settings": {
          "description": "User-configurable AI behavior",
          "settings": [
            {
              "name": "Default Model",
              "description": "Primary model for all AI interactions",
              "type": "model_selector"
            },
            {
              "name": "Fallback Model",
              "description": "Model to use when primary is unavailable",
              "type": "model_selector"
            },
            {
              "name": "Temperature",
              "description": "Creativity level (0 = precise, 1 = creative)",
              "type": "slider",
              "range": [0, 1],
              "default": 0.7
            },
            {
              "name": "Max Tokens",
              "description": "Maximum response length",
              "type": "number",
              "default": 4096
            },
            {
              "name": "System Prompt",
              "description": "Custom instructions for AI behavior",
              "type": "textarea",
              "default": "You are Maddy, a helpful AI assistant integrated into a personal productivity application. You have access to the user's knowledge base, financial data, news feed, and project information. Be concise, actionable, and proactive in offering relevant suggestions."
            },
            {
              "name": "Context Awareness",
              "description": "Allow AI to access data from the current module/page for context",
              "type": "toggle",
              "default": true
            },
            {
              "name": "Proactive Suggestions",
              "description": "Allow AI to proactively offer help",
              "type": "toggle",
              "default": true
            },
            {
              "name": "API Keys",
              "description": "Manage API keys for different providers",
              "type": "key_value_form",
              "encryption": "AES-256 at rest"
            },
            {
              "name": "Usage Tracking",
              "description": "Track token usage and costs per provider",
              "type": "dashboard",
              "metrics": ["tokens_used_today", "tokens_used_month", "estimated_cost", "requests_count", "by_model_breakdown"]
            },
            {
              "name": "Data Privacy",
              "description": "Control what data AI can access",
              "type": "checklist",
              "options": [
                "Knowledge Base content",
                "Financial data",
                "News reading history",
                "Task and project details"
              ]
            }
          ]
        },

        "specialized_ai_agents": {
          "description": "Pre-configured AI agents for specific tasks",
          "agents": [
            {
              "name": "Research Agent",
              "description": "Deep research on a topic using web search + KB",
              "capabilities": ["web search", "KB search", "summarize findings", "create KB page with research"],
              "model_preference": "most capable available"
            },
            {
              "name": "Writing Agent",
              "description": "Long-form content creation and editing",
              "capabilities": ["draft articles", "edit and refine", "tone adjustment", "SEO optimization"],
              "model_preference": "Claude Sonnet or GPT-4o"
            },
            {
              "name": "Finance Agent",
              "description": "Financial analysis and advice",
              "capabilities": ["spending analysis", "budget recommendations", "investment insights", "tax optimization"],
              "model_preference": "most capable available",
              "context": "always has access to user's financial data"
            },
            {
              "name": "Code Agent",
              "description": "Code generation, review, and debugging",
              "capabilities": ["generate code", "debug errors", "explain code", "code review", "suggest optimizations"],
              "model_preference": "Claude Sonnet (preferred for code)"
            },
            {
              "name": "Productivity Agent",
              "description": "Task management and productivity optimization",
              "capabilities": ["prioritize tasks", "suggest schedule", "identify bottlenecks", "daily planning"],
              "model_preference": "fast model for quick interactions"
            }
          ]
        },

        "automation": {
          "description": "AI-powered automations triggered by events",
          "triggers": [
            "New article saved → auto-summarize and tag",
            "New expense added → auto-categorize",
            "Task overdue → notify and suggest reprioritization",
            "Weekly → generate weekly review summary",
            "Monthly → generate monthly finance report",
            "New page created → suggest related pages and templates",
            "Budget threshold reached → alert with insights"
          ]
        }
      },

      "data_model": {
        "Conversation": {
          "id": "uuid",
          "user_id": "uuid",
          "title": "string (auto-generated from first message)",
          "context_module": "enum[general, news, kb, finance] | null",
          "context_page_id": "uuid | null",
          "model_used": "string",
          "is_pinned": "boolean",
          "created_at": "datetime",
          "updated_at": "datetime",
          "message_count": "integer",
          "total_tokens": "integer"
        },
        "Message": {
          "id": "uuid",
          "conversation_id": "uuid",
          "role": "enum[user, assistant, system]",
          "content": "text",
          "model": "string",
          "tokens_input": "integer",
          "tokens_output": "integer",
          "attachments": "json[] (files, images)",
          "metadata": "json (retrieved_chunks, tool_calls, etc.)",
          "created_at": "datetime"
        },
        "AIProvider": {
          "id": "uuid",
          "user_id": "uuid",
          "provider": "enum[openrouter, anthropic, openai, google, groq, together, ollama, custom]",
          "api_key_encrypted": "string",
          "is_active": "boolean",
          "usage_limit_monthly": "integer | null",
          "current_month_usage": "integer",
          "created_at": "datetime"
        },
        "AIUsageLog": {
          "id": "uuid",
          "user_id": "uuid",
          "provider": "string",
          "model": "string",
          "tokens_input": "integer",
          "tokens_output": "integer",
          "estimated_cost_usd": "decimal",
          "request_type": "enum[chat, inline, automation, summarization, embedding]",
          "context_module": "string",
          "latency_ms": "integer",
          "created_at": "datetime"
        }
      },

      "api_endpoints": [
        "POST /api/ai/chat — {conversation_id?, message, model?, context}",
        "GET /api/ai/conversations?cursor={cursor}",
        "GET /api/ai/conversations/{id}/messages",
        "DELETE /api/ai/conversations/{id}",
        "POST /api/ai/conversations/{id}/pin",
        "POST /api/ai/inline — {action, content, context, model?}",
        "POST /api/ai/summarize — {content, level}",
        "POST /api/ai/categorize — {type: 'expense', data}",
        "POST /api/ai/generate — {prompt, type: 'page|task|report', context}",
        "POST /api/ai/search — {query, scope: 'all|kb|news|finance'} (semantic search)",
        "GET /api/ai/models — list available models from configured providers",
        "POST /api/ai/models/test — test API key and model connectivity",
        "GET /api/ai/usage — usage statistics",
        "PUT /api/ai/settings — update AI configuration",
        "GET /api/ai/providers — list configured providers",
        "POST /api/ai/providers — add new provider with API key",
        "PUT /api/ai/providers/{id} — update provider config",
        "DELETE /api/ai/providers/{id}"
      ],

      "ai_gateway_architecture": {
        "description": "Unified proxy layer that routes AI requests to appropriate provider",
        "flow": [
          "1. User sends request (chat, inline, automation)",
          "2. Request hits AI Gateway middleware",
          "3. Gateway determines: model → provider → API key",
          "4. Gateway enriches request with context (RAG retrieval if needed)",
          "5. Gateway applies rate limiting and usage tracking",
          "6. Gateway forwards to provider API",
          "7. Response streamed back to user",
          "8. Usage logged for tracking",
          "9. If primary model fails → auto-fallback to configured fallback"
        ],
        "middleware_stack": [
          "auth_check — verify user is authenticated",
          "rate_limiter — per-user rate limits",
          "context_enricher — add relevant context from RAG",
          "model_router — select appropriate model",
          "api_key_resolver — decrypt and inject API key",
          "request_transformer — normalize request format for provider",
          "response_transformer — normalize response format",
          "usage_tracker — log tokens, cost, latency",
          "error_handler — retry logic, fallback routing"
        ]
      }
    }
  },

  "cross_module_integration": {
    "description": "Deep interconnections between all modules — this is what makes MADVERSE unique",
    "integrations": [
      {
        "from": "news",
        "to": "kb",
        "actions": [
          "Save article to Knowledge Base as a new page with metadata",
          "Create task from article ('Explore tool X mentioned in article')",
          "Auto-link article to related KB pages",
          "News digest saved as daily KB page"
        ]
      },
      {
        "from": "news",
        "to": "ai",
        "actions": [
          "AI summarizes articles",
          "AI generates personalized feed",
          "AI answers questions about articles",
          "AI detects trends across articles"
        ]
      },
      {
        "from": "kb",
        "to": "finance",
        "actions": [
          "Project costs tracked in finance module",
          "AI tool costs from KB tracker synced to finance subscriptions",
          "Financial goals linked to project milestones"
        ]
      },
      {
        "from": "kb",
        "to": "ai",
        "actions": [
          "AI writing assistant in all KB pages",
          "AI-powered search across KB (semantic)",
          "AI auto-tagging and linking",
          "AI generates summaries, action items, content",
          "RAG over entire KB for Q&A"
        ]
      },
      {
        "from": "finance",
        "to": "ai",
        "actions": [
          "AI categorizes transactions",
          "AI generates financial insights",
          "AI analyzes spending patterns",
          "AI provides investment analysis",
          "AI generates financial reports with narrative"
        ]
      },
      {
        "from": "finance",
        "to": "news",
        "actions": [
          "News about stocks/funds in user's portfolio highlighted",
          "Market news affects investment recommendations",
          "Finance section in daily digest includes portfolio-relevant news"
        ]
      },
      {
        "from": "ai",
        "to": "all",
        "actions": [
          "Global search across all modules",
          "Cross-module queries ('What AI tools am I paying for and how much?')",
          "Daily briefing combines news + tasks + finance",
          "Proactive suggestions based on all data"
        ]
      }
    ]
  },

  "global_features": {
    "notifications": {
      "types": [
        "Task due/overdue reminders",
        "Budget threshold alerts",
        "Bill payment reminders",
        "Breaking news alerts",
        "AI insight notifications",
        "Daily digest ready",
        "Investment price alerts"
      ],
      "channels": ["in-app (notification center)", "push (PWA)", "email (optional)"],
      "preferences": "per-type enable/disable and channel selection"
    },
    "dashboard": {
      "description": "Home dashboard with customizable widget layout",
      "default_widgets": [
        "Good morning greeting with date/weather",
        "Today's tasks (from KB project management)",
        "Quick capture (add note, expense, or task)",
        "Daily digest preview (top 3 news stories)",
        "Financial snapshot (net income this month)",
        "AI suggestion of the day",
        "Upcoming deadlines (next 7 days)",
        "Recent pages (quick access)"
      ],
      "customization": "drag to reorder, resize, add/remove widgets, create custom widgets from any database"
    },
    "quick_capture": {
      "description": "Universal quick-add from anywhere in the app (⌘⇧C)",
      "targets": [
        "Quick note (goes to Inbox in KB)",
        "Quick task (goes to default task database)",
        "Quick expense (goes to finance transactions)",
        "Quick bookmark (saves URL with metadata)"
      ]
    },
    "global_search": {
      "trigger": "⌘K",
      "scope": "all modules simultaneously",
      "features": [
        "Fuzzy text search",
        "AI semantic search",
        "Filter by module",
        "Recent searches",
        "Quick actions from results"
      ]
    },
    "keyboard_shortcuts": {
      "global": {
        "⌘K": "Command palette / search",
        "⌘N": "New page",
        "⌘⇧C": "Quick capture",
        "⌘J": "Toggle AI panel",
        "⌘1-4": "Switch modules (News, KB, Finance, AI)",
        "⌘,": "Settings",
        "⌘/": "Keyboard shortcut reference"
      },
      "editor": {
        "⌘B": "Bold",
        "⌘I": "Italic",
        "⌘U": "Underline",
        "⌘⇧S": "Strikethrough",
        "⌘E": "Inline code",
        "⌘⇧H": "Highlight",
        "⌘⇧1-3": "Heading 1-3",
        "Tab": "Indent",
        "⇧Tab": "Outdent",
        "/": "Slash commands",
        "⌘Enter": "Toggle todo",
        "⌘⇧M": "Comment"
      }
    },
    "settings": {
      "sections": [
        "Profile & Account",
        "Appearance (theme, font, density)",
        "AI Configuration (models, keys, behavior)",
        "News Preferences (sources, categories, digest)",
        "Finance Settings (currency, categories, accounts)",
        "Notifications",
        "Keyboard Shortcuts (customizable)",
        "Import / Export",
        "Data & Privacy",
        "Billing (if SaaS)"
      ]
    }
  },

  "scalability_architecture": {
    "description": "How this system scales from MVP to production",
    "phases": [
      {
        "phase": "MVP (Month 1-2)",
        "features": [
          "Basic KB with document pages and simple database",
          "AI chat panel with OpenRouter free models",
          "Basic news feed from RSS sources",
          "Simple expense tracker",
          "Authentication and user settings"
        ],
        "tech": "Next.js full-stack, PostgreSQL, single deployment on Vercel"
      },
      {
        "phase": "V1 (Month 3-4)",
        "features": [
          "Full block editor with all block types",
          "Database views (table, board, list)",
          "Multi-model AI with API key management",
          "News AI summarization and categorization",
          "Full income/expense/budget system",
          "Command palette and keyboard shortcuts"
        ],
        "tech": "Add Redis cache, Meilisearch, background job queue"
      },
      {
        "phase": "V2 (Month 5-7)",
        "features": [
          "RAG over knowledge base",
          "Investment portfolio tracking",
          "News personalization algorithm",
          "Database relations, rollups, formulas",
          "Timeline and calendar views",
          "Cross-module AI queries",
          "Daily digest system"
        ],
        "tech": "Add vector database, advanced AI pipeline, WebSocket for real-time"
      },
      {
        "phase": "V3 (Month 8-12)",
        "features": [
          "Graph view for KB",
          "Canvas/whiteboard",
          "AI agents (research, finance, code)",
          "Receipt OCR",
          "Investment AI recommendations",
          "Custom dashboards",
          "API for third-party integrations",
          "Mobile PWA optimization",
          "Collaboration features (sharing, permissions)"
        ],
        "tech": "Microservices for heavy workloads, CDN for assets, advanced monitoring"
      }
    ],
    "performance_targets": {
      "page_load": "< 1 second (LCP)",
      "search_results": "< 200ms",
      "ai_first_token": "< 500ms (streaming)",
      "editor_input_latency": "< 50ms",
      "api_response_p95": "< 300ms"
    }
  },

  "security": {
    "authentication": "Multi-factor, OAuth 2.0, Passkeys",
    "authorization": "Row-level security (RLS) in PostgreSQL",
    "encryption": {
      "at_rest": "AES-256 for API keys and sensitive financial data",
      "in_transit": "TLS 1.3",
      "client_side": "Web Crypto API for local encryption of sensitive data"
    },
    "api_keys": "stored encrypted, never sent to client, decrypted only at proxy layer",
    "data_privacy": {
      "ai_data": "user controls what data AI can access",
      "no_training": "user data is never used to train AI models",
      "export": "user can export all their data at any time",
      "deletion": "full account and data deletion supported"
    }
  },

  "prompt_engineering": {
    "system_prompts": {
      "general_assistant": "You are Maddy, an AI assistant embedded in a personal productivity application. You help the user with their knowledge management, financial decisions, news analysis, and productivity. Be concise, actionable, and friendly. When you have access to the user's data (knowledge base, finances, tasks), reference it specifically. Always format responses with markdown for readability. If you're unsure about something, say so rather than guessing.",

      "news_summarizer": "You are a news summarization expert. Given an article, provide: 1) A one-line headline summary, 2) A 3-sentence brief summary covering the key points, 3) 3-5 bullet point takeaways, 4) A relevance assessment for someone interested in AI, technology, and productivity. Be factual and unbiased. If the article contains opinions, distinguish them from facts.",

      "finance_advisor": "You are a financial analysis assistant (NOT a licensed financial advisor). You help the user understand their spending patterns, budget optimization, and investment education. Always include the disclaimer that this is not financial advice. Use the user's actual financial data when available. Provide specific numbers and percentages. Suggest actionable steps. For investment analysis, present both risks and potential benefits.",

      "writing_assistant": "You are a skilled writing assistant. Help the user improve their writing by: fixing grammar and spelling, improving clarity and flow, maintaining their voice and style, and enhancing structure. When rewriting, preserve the original meaning. When expanding, add relevant detail and examples. When summarizing, capture the essential points.",

      "code_assistant": "You are an expert programmer. Write clean, well-commented code. Follow best practices for the language/framework being used. When explaining code, break it down step by step. When debugging, identify the root cause and explain why the fix works. Always consider edge cases and error handling."
    }
  }
}
```

---

## Visual Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MADVERSE APPLICATION                          │
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                          │               │
│ SIDEBAR  │            MAIN CONTENT AREA             │   AI PANEL    │
│          │                                          │   (⌘J)       │
│ ┌──────┐ │  ┌────────────────────────────────────┐  │ ┌───────────┐│
│ │Search│ │  │  📰 News    │ 🧠 KB    │ 💰 Finance│  │ │  Model:   ││
│ │ ⌘K   │ │  │  Feed      │ Pages   │ Dashboard  │  │ │  Claude ▾ ││
│ └──────┘ │  └────────────────────────────────────┘  │ ├───────────┤│
│          │                                          │ │           ││
│ MODULES  │  ┌────────────────────────────────────┐  │ │  Chat     ││
│ ┌──────┐ │  │                                    │  │ │  History  ││
│ │📰News│ │  │                                    │  │ │           ││
│ │🧠 KB │ │  │        Active Module Content       │  │ │  User: ?  ││
│ │💰Fin │ │  │                                    │  │ │  AI: ...  ││
│ │✨ AI │ │  │    (Pages, Articles, Charts,       │  │ │           ││
│ └──────┘ │  │     Databases, Transactions)       │  │ │  User: ?  ││
│          │  │                                    │  │ │  AI: ...  ││
│ FAVS     │  │                                    │  │ │           ││
│ ┌──────┐ │  │                                    │  │ ├───────────┤│
│ │Page 1│ │  │                                    │  │ │           ││
│ │Page 2│ │  │                                    │  │ │  [Send]   ││
│ └──────┘ │  └────────────────────────────────────┘  │ └───────────┘│
│          │                                          │               │
│ RECENT   │  ┌────────────────────────────────────┐  │               │
│ ┌──────┐ │  │  Status Bar: Last saved • Words    │  │               │
│ │Page A│ │  └────────────────────────────────────┘  │               │
│ │Page B│ │                                          │               │
│ └──────┘ │                                          │               │
├──────────┴──────────────────────────────────────────┴───────────────┤
│  ⌘K Search  │  ⌘N New  │  ⌘⇧C Capture  │  ⌘J AI  │  ⌘, Settings │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   AI GATEWAY    │
                    │   (Proxy Layer) │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
        │OpenRouter │  │ Claude   │  │  GPT     │
        │(Free+Paid)│  │ (Direct) │  │ (Direct) │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
        ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
        │ Gemini   │  │  Groq    │  │  Ollama  │
        │ (Direct) │  │ (Free)   │  │ (Local)  │
        └──────────┘  └──────────┘  └──────────┘
```

---

## Database Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                │
├──────────────┬─────────────┬──────────────┬──────────────────┤
│  PostgreSQL  │   MongoDB   │    Redis     │  Vector DB       │
│  (Primary)   │  (Documents)│   (Cache)    │  (Embeddings)    │
│              │             │              │                  │
│ • Users      │ • KB Blocks │ • Sessions   │ • Page vectors   │
│ • Accounts   │ • Page      │ • Feed cache │ • Article vectors│
│ • Txns       │   content   │ • Rate limits│ • Query vectors  │
│ • Articles   │ • Templates │ • Real-time  │                  │
│ • Budgets    │             │   presence   │                  │
│ • Investments│             │              │                  │
│ • AI Convos  │             │              │                  │
│ • Providers  │             │              │                  │
├──────────────┴─────────────┴──────────────┴──────────────────┤
│                      Meilisearch                              │
│              (Full-text search across all modules)            │
└──────────────────────────────────────────────────────────────┘
```

---

## How to Use This Prompt

| Use Case | Action |
|---|---|
| **Feed to AI for code generation** | Pass the entire JSON as a system prompt to Claude/GPT-4 with "Implement module X based on this spec" |
| **Project planning** | Extract the `scalability_architecture.phases` section for sprint planning |
| **Database design** | Use `data_model` sections to generate Prisma/Drizzle schemas |
| **API development** | Use `api_endpoints` arrays to scaffold route handlers |
| **UI development** | Use `ui_layout` specs + `global_ui_ux` for component architecture |
| **AI integration** | Use `ai_gateway_architecture` to build the model routing proxy |

This JSON prompt is designed to be **iteratively fed** into your development pipeline — pick a module, pick a phase, and generate. The cross-references ensure consistency as you build each piece. 🚀