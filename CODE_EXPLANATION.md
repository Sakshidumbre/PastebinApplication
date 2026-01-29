# Pastebin-Lite: Code Explanation for Interview

## 📋 Project Overview

**Pastebin-Lite** is a full-stack web application built with Next.js 14 that allows users to create, store, and share text pastes (code snippets, notes) with optional expiration and view limits. It demonstrates modern web development practices with server-side rendering, API routes, and scalable data storage.

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router) - React with server-side rendering
- **Language**: TypeScript - Full type safety
- **Database**: Upstash Redis (serverless Redis) with in-memory fallback
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready (serverless)

### System Architecture Flow

```
User Browser
    ↓
Next.js App Router
    ├── Pages (SSR) → app/page.tsx, app/p/[id]/page.tsx
    └── API Routes → app/api/pastes/route.ts
    ↓
Business Logic Layer
    ├── lib/utils.ts (ID generation, HTML escaping, availability checks)
    ├── lib/validation.ts (Request validation)
    └── lib/request-utils.ts (Time handling, URL generation)
    ↓
Data Access Layer
    └── lib/kv.ts (Redis/in-memory storage abstraction)
    ↓
Storage
    ├── Upstash Redis (Production)
    └── In-Memory Map (Development Fallback)
```

---

## 🔑 Core Components Explained

### 1. **Data Access Layer (`lib/kv.ts`)**

**Purpose**: Abstracts storage operations, supporting both Redis (production) and in-memory Map (development).

#### Key Functions:

**`getRedis()`** - Lazy Redis initialization
```typescript
async function getRedis(): Promise<any> {
  // Only initializes once
  // Checks for UPSTASH_REDIS_REST_URL or KV_REST_API_URL
  // Returns null if Redis unavailable (falls back to memory)
}
```

**`getPaste(id, currentTime)`** - Retrieve a paste
```typescript
export async function getPaste(id: string, currentTime?: number): Promise<Paste | null> {
  // 1. Try Redis first
  // 2. Check TTL expiration manually (Redis handles this, but we verify)
  // 3. Fall back to memory store if Redis fails
  // 4. Clean up expired entries in memory
  // 5. Return paste or null if not found/expired
}
```

**`createPaste(paste, createdAt)`** - Store a new paste
```typescript
export async function createPaste(paste: Paste, createdAt?: number): Promise<void> {
  // Redis: Uses setex() for TTL, set() for permanent
  // Also adds to sorted set index for listing
  // Memory: Stores with calculated expiresAt timestamp
}
```

**`incrementViewCount(id, currentTime)`** - Atomically increment views
```typescript
export async function incrementViewCount(id: string, currentTime?: number): Promise<void> {
  // 1. Get current paste
  // 2. Increment viewCount
  // 3. Recalculate remaining TTL if needed
  // 4. Save back to storage
  // Critical: This is atomic in Redis, preventing race conditions
}
```

**Design Decisions**:
- **Dual Storage**: Works without Redis locally, scales with Redis in production
- **Lazy Loading**: Redis client only initialized when needed
- **Graceful Degradation**: Falls back to memory if Redis fails
- **TTL Management**: Uses Redis native TTL + manual checks for memory

---

### 2. **API Route: Create Paste (`app/api/pastes/route.ts`)**

**Endpoint**: `POST /api/pastes`

#### Request Flow:

```typescript
export async function POST(request: NextRequest) {
  // 1. Parse JSON body
  const body = await request.json();
  
  // 2. Validate request (content required, types checked)
  const validation = validateCreatePasteRequest(body);
  if (!validation.valid) {
    return validation.error!; // Returns 400 with error message
  }
  
  // 3. Extract and process fields
  const { content, ttl_seconds, max_views, title, syntax, expiration, burn_after_read } = body;
  const currentTime = getTestTime(request); // Supports test mode
  
  // 4. Convert expiration string to seconds (e.g., "1h" → 3600)
  const ttlSeconds = getTtlFromExpiration(expiration, ttl_seconds);
  
  // 5. Handle "burn after read" (sets max_views to 1)
  const maxViews = burn_after_read ? 1 : (max_views ?? null);
  
  // 6. Generate unique 8-character ID
  const id = generateId();
  
  // 7. Create paste object
  const paste = {
    id,
    content: content.trim(),
    title: title?.trim() || undefined,
    syntax: syntax || undefined,
    createdAt: currentTime,
    ttlSeconds: ttlSeconds,
    maxViews: maxViews,
    viewCount: 0,
    burnAfterRead: burn_after_read || false,
  };
  
  // 8. Store in database
  await createPaste(paste, currentTime);
  
  // 9. Generate shareable URL
  const baseUrl = getBaseUrl(request); // Detects protocol and host
  return NextResponse.json({ id, url: `${baseUrl}/p/${id}` }, { status: 201 });
}
```

**Key Points**:
- **Input Validation**: Comprehensive validation prevents invalid data
- **ID Generation**: Uses `crypto.getRandomValues` for secure randomness
- **URL Generation**: Automatically detects base URL from headers
- **Error Handling**: Try-catch with 500 error on failures

---

### 3. **API Route: Get Paste (`app/api/pastes/[id]/route.ts`)**

**Endpoint**: `GET /api/pastes/:id`

#### Request Flow:

```typescript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const currentTime = getTestTime(request);
  
  // 1. Fetch paste from storage
  const paste = await getPaste(id, currentTime);
  
  // 2. Check if paste exists
  if (!paste) {
    return NOT_FOUND_RESPONSE; // 404
  }
  
  // 3. Check availability (TTL, max views, burn after read)
  if (!isPasteAvailable(paste, currentTime)) {
    return NOT_FOUND_RESPONSE; // 404 (doesn't leak info)
  }
  
  // 4. Increment view count (this counts as a view)
  await incrementViewCount(id, currentTime);
  
  // 5. Fetch updated paste to get new viewCount
  const updatedPaste = await getPaste(id, currentTime);
  if (!updatedPaste) {
    return NOT_FOUND_RESPONSE; // Could be deleted (burn after read)
  }
  
  // 6. Calculate response data
  const response = {
    content: updatedPaste.content,
    remaining_views: calculateRemainingViews(updatedPaste),
    expires_at: calculateExpiresAt(updatedPaste),
  };
  
  return NextResponse.json(response, { status: 200 });
}
```

**Important**: View count is incremented **after** checking availability. This ensures:
- Expired pastes don't get view increments
- View count accurately reflects the current view
- Race conditions are minimized (Redis operations are atomic)

---

### 4. **Paste Display Page (`app/p/[id]/page.tsx`)**

**Route**: `GET /p/:id` (Server-Side Rendered)

#### Server Component Flow:

```typescript
export default async function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const currentTime = getTestTimeFromHeaders();
  
  // 1. Fetch paste
  const paste = await getPaste(id, currentTime);
  
  // 2. Check existence
  if (!paste) {
    notFound(); // Next.js 404 page
  }
  
  // 3. Check availability
  if (!isPasteAvailable(paste, currentTime)) {
    notFound();
  }
  
  // 4. Increment view count
  await incrementViewCount(id, currentTime);
  
  // 5. Get updated paste (handles burn after read deletion)
  const updatedPaste = await getPaste(id, currentTime);
  const displayPaste = updatedPaste ?? { ...paste, viewCount: paste.viewCount + 1 };
  
  // 6. Prepare rendering data
  const syntaxClass = getSyntaxClass(displayPaste.syntax);
  const hasSyntax = !!displayPaste.syntax;
  const pasteUrl = `${protocol}://${host}/p/${id}`;
  
  // 7. Render HTML with escaped content
  return (
    <>
      {/* Prism.js for syntax highlighting */}
      {hasSyntax && <Script src="prism.js" />}
      
      {/* Paste content with XSS protection */}
      <code dangerouslySetInnerHTML={
        hasSyntax 
          ? { __html: escapeHtmlForCode(displayPaste.content) }
          : undefined
      }>
        {hasSyntax ? null : escapeHtml(displayPaste.content)}
      </code>
    </>
  );
}
```

**Security Features**:
- **XSS Protection**: All content is HTML-escaped
- **Server-Side Validation**: Availability checked before rendering
- **Safe Rendering**: Uses `dangerouslySetInnerHTML` only for syntax highlighting (with escaped content)

---

### 5. **Home Page Form (`app/page.tsx`)**

**Client Component**: React form for creating pastes

#### Key Features:

```typescript
export default function Home() {
  // State management
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [syntax, setSyntax] = useState('');
  const [expiration, setExpiration] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Build request body
    const body: any = { content };
    if (title.trim()) body.title = title.trim();
    if (syntax) body.syntax = syntax;
    if (expiration) body.expiration = expiration;
    if (maxViews) body.max_views = parseInt(maxViews, 10);
    if (burnAfterRead) body.burn_after_read = true;
    
    // POST to API
    const response = await fetch('/api/pastes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      setError(data.error || 'Failed to create paste');
      return;
    }
    
    // Success: show result and reset form
    setResult(data);
    // Clear all form fields...
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with Tailwind CSS styling */}
      {/* Error display */}
      {/* Success message with copy URL button */}
    </form>
  );
}
```

**UX Features**:
- **Loading States**: Button disabled during submission
- **Error Display**: Shows API errors to user
- **Success Feedback**: Displays paste ID and URL
- **Copy to Clipboard**: One-click URL copying
- **Form Reset**: Clears form after successful creation

---

### 6. **Utility Functions (`lib/utils.ts`)**

#### `generateId()` - Secure ID Generation
```typescript
export function generateId(): string {
  // Uses crypto.getRandomValues for secure randomness
  // Falls back to Math.random() if crypto unavailable
  // Returns 8-character alphanumeric string
  // Example: "aB3dEf9h"
}
```

#### `escapeHtml()` - XSS Protection
```typescript
export function escapeHtml(text: string): string {
  // Escapes: & → &amp;, < → &lt;, > → &gt;, " → &quot;, ' → &#039;
  // Prevents XSS attacks from user-generated content
}
```

#### `isPasteAvailable()` - Business Logic
```typescript
export function isPasteAvailable(
  paste: { createdAt, ttlSeconds, maxViews, viewCount, burnAfterRead },
  currentTime: number
): boolean {
  // 1. Check TTL expiration
  if (paste.ttlSeconds) {
    const elapsedSeconds = Math.floor((currentTime - paste.createdAt) / 1000);
    if (elapsedSeconds >= paste.ttlSeconds) {
      return false; // Expired
    }
  }
  
  // 2. Check max views
  if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
    return false; // Max views reached
  }
  
  // 3. Check burn after read
  if (paste.burnAfterRead && paste.viewCount >= 1) {
    return false; // Already viewed
  }
  
  return true; // Available
}
```

---

### 7. **Validation Layer (`lib/validation.ts`)**

**Purpose**: Centralized request validation

```typescript
export function validateCreatePasteRequest(body: any): { 
  valid: boolean; 
  error?: NextResponse<ErrorResponse> 
} {
  // Validates:
  // - content: required, non-empty string
  // - title: optional, max 200 characters
  // - syntax: optional string
  // - ttl_seconds: integer >= 1 (if provided)
  // - expiration: must match predefined options
  // - max_views: integer >= 1 (if provided)
  // - burn_after_read: boolean
  
  // Returns { valid: true } or { valid: false, error: NextResponse }
}
```

---

## 🎯 Design Decisions & Trade-offs

### 1. **View Counting Strategy**
- **Decision**: Both API and HTML views increment the counter
- **Rationale**: Prevents bypassing view limits via API calls
- **Trade-off**: API calls consume a view (by design)

### 2. **ID Generation**
- **Decision**: 8-character alphanumeric IDs
- **Rationale**: Short, URL-friendly, readable
- **Trade-off**: Lower collision resistance than UUIDs (acceptable for this scale)

### 3. **Storage Abstraction**
- **Decision**: Dual storage (Redis + in-memory)
- **Rationale**: Works locally without setup, scales in production
- **Trade-off**: In-memory data lost on restart (acceptable for development)

### 4. **Error Handling**
- **Decision**: All unavailable pastes return 404
- **Rationale**: Doesn't leak information about paste existence
- **Trade-off**: Can't distinguish between "not found" and "expired"

### 5. **TTL Implementation**
- **Decision**: Use Redis native TTL + manual checks
- **Rationale**: Leverages Redis's efficient expiration
- **Trade-off**: Requires manual expiration checks in in-memory fallback

---

## 🔒 Security Features

1. **XSS Protection**: All user content is HTML-escaped
2. **Input Validation**: Server-side validation prevents malicious input
3. **Error Messages**: Generic errors don't leak sensitive information
4. **Secure ID Generation**: Uses `crypto.getRandomValues`
5. **Content Sanitization**: Only safe HTML characters preserved

---

## 🧪 Testing Support

**Test Mode**: Environment variable `TEST_MODE=1`
- Allows deterministic time control via `x-test-now-ms` header
- Enables testing TTL expiration without waiting
- Useful for automated test suites

Example:
```typescript
// In test
process.env.TEST_MODE = '1';
headers['x-test-now-ms'] = '1704067200000'; // Specific timestamp
```

---

## 📊 Data Model

```typescript
interface Paste {
  id: string;                    // Unique identifier (8 chars)
  content: string;                // Paste content
  title?: string;                 // Optional title (max 200 chars)
  syntax?: string;                // Programming language
  createdAt: number;             // Timestamp (milliseconds)
  ttlSeconds: number | null;      // Time to live (seconds)
  maxViews: number | null;        // Maximum view count
  viewCount: number;              // Current view count
  burnAfterRead?: boolean;        // Delete after first view
}
```

**Storage**:
- **Key Format**: `paste:{id}`
- **Index Key**: `paste_index:public` (Redis sorted set for listing)

---

## 🔄 Complete Request Flow Examples

### Creating a Paste
```
1. User fills form → React state updates
2. User clicks "Create" → handleSubmit() called
3. POST /api/pastes → Next.js API route
4. Validate request → lib/validation.ts
5. Generate ID → lib/utils.ts (crypto.getRandomValues)
6. Create paste object with metadata
7. Store in Redis → lib/kv.ts (setex for TTL, set for permanent)
8. Add to index → Redis sorted set
9. Return { id, url } → JSON response
10. Display success message → React state update
11. Show copy URL button → User can share
```

### Viewing a Paste
```
1. User visits /p/:id → Next.js page route
2. Server fetches paste → lib/kv.ts (getPaste)
3. Check availability → lib/utils.ts (isPasteAvailable)
4. Increment view count → lib/kv.ts (incrementViewCount - atomic)
5. Fetch updated paste → Get new viewCount
6. Render HTML → Server-side rendering
7. Escape content → lib/utils.ts (escapeHtml)
8. Load Prism.js → If syntax highlighting needed
9. Display paste → Client receives HTML
10. Show metadata → Views, expiration, etc.
```

---

## 💡 Interview Talking Points

### Architecture
- **Serverless-Ready**: Designed for Vercel/serverless deployment
- **Type-Safe**: Full TypeScript implementation
- **Scalable**: Redis handles high concurrency
- **Developer-Friendly**: Works locally without external dependencies

### Code Quality
- **Separation of Concerns**: Clear layers (API, Business Logic, Data Access)
- **Error Handling**: Comprehensive error handling at all levels
- **Type Safety**: Strong TypeScript typing throughout
- **Reusability**: Utility functions are modular and testable

### Best Practices
- **Security First**: XSS protection, input validation
- **Performance**: Efficient storage operations, lazy loading
- **User Experience**: Loading states, error messages, copy-to-clipboard
- **Maintainability**: Well-organized code structure, clear naming

---

## 🎯 Key Takeaways for Interview

1. **Full-Stack Understanding**: Demonstrates both frontend (React) and backend (API routes) skills
2. **Database Design**: Shows understanding of Redis, TTL, and data modeling
3. **Security Awareness**: XSS protection, input validation, secure ID generation
4. **Architecture Skills**: Clean separation of concerns, abstraction layers
5. **Production-Ready**: Error handling, fallbacks, scalability considerations
6. **Modern Stack**: Next.js 14, TypeScript, serverless architecture

---

## 📝 Common Interview Questions & Answers

**Q: Why Redis instead of a traditional database?**
A: Redis provides native TTL support for automatic expiration, fast read/write operations, and is serverless-compatible. Perfect for this use case where we need fast lookups and automatic cleanup.

**Q: How do you handle race conditions?**
A: Redis operations are atomic. The `incrementViewCount` function uses Redis's atomic operations. We also check availability before incrementing to prevent counting views for unavailable pastes.

**Q: What happens if Redis is down?**
A: The application gracefully falls back to an in-memory Map. This allows local development without Redis and provides resilience, though in-memory data is lost on restart.

**Q: How would you scale this?**
A: Redis already handles high concurrency. For further scaling, we could:
- Add caching layers (CDN for static assets)
- Implement rate limiting
- Add database sharding if needed
- Use Redis Cluster for distributed storage

**Q: Why server-side rendering for the paste page?**
A: SSR ensures the paste content is available immediately, improves SEO, and allows server-side validation before rendering. It also prevents client-side manipulation of view counts.

**Q: How does "burn after read" work?**
A: When `burnAfterRead` is true, `maxViews` is set to 1. After the first view, `incrementViewCount` is called, making `viewCount >= maxViews`. The next availability check returns false, and the paste appears deleted (though it may still exist briefly in storage).

---

This codebase demonstrates production-ready development practices, security awareness, and scalable architecture design. It's a great example of a modern full-stack application built with best practices in mind.
