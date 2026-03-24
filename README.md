# MadVibe — AI-Powered Personal Knowledge OS

> Your second brain, supercharged by Maddy AI.

![MadVibe](https://img.shields.io/badge/MadVibe-AI--Knowledge--OS-7c3aed?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-Real--time-ff6b35?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)

---

## ✨ Features

### 📝 Rich Document Editing
- **BlockNote editor** — Notion-like block-based editor with slash commands
- **Page hierarchy** — Nested pages with unlimited depth
- **Page customisation** — Emoji icons, cover images, full-width mode
- **3 page types** — Document, Database, Dashboard

### 🗄️ Powerful Databases
- **4 view types** — Table, Board (Kanban), List, Calendar
- **8 property types** — Title, Text, Number, Select, Checkbox, Date, URL, and more
- **Real-time collaboration** — Instant sync across all tabs/devices via Convex

### 🤖 Maddy AI (Powered by Google Gemini)
- **Auto-tagging** — Automatically categorises your pages with relevant tags
- **Page summarisation** — Get a 3-5 bullet summary of any page
- **Task extraction** — Pull out action items from your documents
- **Semantic search** — Find related pages by meaning, not just keywords
- **Inline AI commands** — Explain, rewrite, continue, brainstorm, translate
- **Workspace organisation** — AI-suggested restructuring of your knowledge base
- **Related pages** — Discover connected content automatically

### 🎨 Polished UX
- **Dark/Light/System** themes with instant switching
- **6 accent colours** — Violet, Indigo, Rose, Amber, Emerald, Sky
- **3 font families** — Default (Inter), Serif (Georgia), Mono (JetBrains Mono)
- **Command palette** (`⌘K`) — Search, navigate, create in one keystroke
- **Collapsible sidebar** with page tree and favourites
- **Full keyboard shortcut** support

### 📱 Progressive Web App (PWA)
- **Install to home screen** on mobile and desktop
- **Offline support** via service worker caching
- **Optimistic updates** — Instant UI responses

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Convex account (free at [convex.dev](https://convex.dev))
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Convex
```bash
npx convex dev
```
This will:
- Create a new Convex project (or link existing)
- Generate `convex/_generated/` types
- Start the Convex backend in watch mode

Copy the `NEXT_PUBLIC_CONVEX_URL` from the Convex dashboard.

### 3. Configure environment
```bash
cp .env.local.example .env.local
```
Fill in your Convex URL:
```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### 4. Start the Next.js dev server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Add your Gemini API key
1. Go to **Settings → Maddy AI**
2. Paste your Gemini API key
3. All AI features are now unlocked 🎉

---

## 📁 Project Structure

```
madvibe/
├── convex/                    # Convex backend
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Authentication
│   ├── pages.ts               # Page CRUD + search
│   ├── blocks.ts              # Block content
│   ├── databases.ts           # Database/rows/views
│   ├── workspaces.ts          # Workspaces + settings
│   └── maddy.ts               # All Maddy AI actions
│
└── src/
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # Root layout + providers
    │   ├── page.tsx           # Redirect entry point
    │   ├── login/             # Auth pages
    │   └── workspace/         # Main app
    │       ├── layout.tsx     # Workspace shell
    │       ├── page.tsx       # New page dashboard
    │       ├── [pageId]/      # Dynamic page viewer
    │       ├── settings/      # Settings page
    │       └── trash/         # Trash page
    │
    ├── components/
    │   ├── database/          # Database view components
    │   │   ├── database-view  # View switcher
    │   │   ├── table-view     # Spreadsheet view
    │   │   ├── board-view     # Kanban view
    │   │   ├── list-view      # List view
    │   │   └── property-cell  # Cell renderer
    │   │
    │   ├── editor/            # Page editor
    │   │   ├── blocknote-editor  # BlockNote integration
    │   │   ├── page-header    # Title, icon, cover
    │   │   └── page-view      # Full page renderer
    │   │
    │   ├── layout/            # App layout
    │   │   └── command-palette # ⌘K search
    │   │
    │   ├── maddy/             # AI assistant
    │   │   └── maddy-panel    # Slide-in AI panel
    │   │
    │   ├── providers/         # React context providers
    │   ├── pwa/               # PWA components
    │   ├── sidebar/           # Navigation sidebar
    │   └── ui/                # Shadcn/ui components
    │
    ├── store/                 # Zustand state
    │   ├── app.store.ts       # Global app state
    │   └── editor.store.ts    # Editor state
    │
    ├── types/                 # TypeScript types
    └── lib/                   # Utilities
```

---

## 🗄️ Data Architecture

### Convex Tables
| Table | Purpose |
|-------|---------|
| `users` | Auth (managed by @convex-dev/auth) |
| `workspaces` | User workspaces |
| `pages` | All pages (docs, databases, dashboards) |
| `blocks` | Block content stored as JSON |
| `databases` | Database schema (properties) |
| `rows` | Database row data |
| `views` | Saved database views |
| `maddyEmbeddings` | Vector embeddings for semantic search |
| `userSettings` | User preferences |

### Storage
- **Convex DB** — All structured data (real-time sync)
- **Convex Vector Index** — Semantic search embeddings (768-dim)
- **localStorage** — UI preferences (theme, sidebar state)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `⌘\` | Toggle sidebar |
| `⌘N` | New page |
| `⌘,` | Settings |
| `/` | Slash commands in editor |
| `⌘B` | Bold |
| `⌘I` | Italic |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Backend** | Convex (real-time serverless) |
| **Auth** | @convex-dev/auth (Password + Anonymous) |
| **Editor** | BlockNote v0.20 |
| **AI** | Google Gemini 1.5 Flash + text-embedding-004 |
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **Animations** | Framer Motion |
| **State** | Zustand v5 |
| **Icons** | Lucide React |
| **Theming** | next-themes |

---

## 🚢 Deployment

### Deploy to Vercel
```bash
# Deploy Convex backend
npx convex deploy

# Deploy to Vercel (automatic from GitHub)
vercel --prod
```

### Required environment variables
```env
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```

---

## 📄 License

MIT — Build your second brain, your way.

---

*Built with ❤️ using Next.js, Convex, and Google Gemini*
