# Collaboration Features for Medical Research Teams

This document describes the collaboration features implemented for medical research teams.

## Overview

The collaboration system enables medical research teams to work together on systematic reviews, share findings, annotate articles, and discuss research in real-time.

## Features

### 1. Collections Management

Shared collections allow teams to organize and curate research articles:

- **Create Collections**: Create named collections with descriptions and tags
- **Add Articles**: Add articles from search results to collections
- **Share Collections**: Invite team members with specific permissions
- **Manage Permissions**: Three permission levels - read, write, admin

### 2. Annotations

Highlight and annotate articles for collaborative analysis:

- **Text Highlighting**: Highlight important passages with color coding
- **Notes**: Add detailed notes to highlighted text
- **Bookmarks**: Quick bookmarking for reference
- **Privacy Control**: Keep annotations private or share with the team

### 3. Real-time Comments

Discussion threads on articles and annotations:

- **Threaded Discussions**: Reply to comments for organized conversations
- **Reactions**: Quick emoji reactions to comments
- **Resolve Comments**: Mark discussions as resolved
- **Real-time Updates**: See new comments instantly via WebSocket

### 4. Activity Feed

Track team activity and stay informed:

- **Activity Types**: Collection updates, annotations, comments, member changes
- **Filtering**: Filter by activity type
- **Real-time**: Live updates as activities occur
- **History**: Complete audit trail of team collaboration

### 5. Sharing & Invitations

Manage team access:

- **Email Invitations**: Invite by email with custom messages
- **Permission Levels**: Read, Write, Admin permissions
- **Link Sharing**: Share collections via link
- **Pending Invitations**: Track and manage pending invites

### 6. Offline Support

Work offline with automatic sync:

- **IndexedDB Storage**: Local storage of collections and annotations
- **Pending Operations**: Queue changes when offline
- **Automatic Sync**: Sync when connection is restored
- **Conflict Detection**: Handle conflicts from concurrent edits

## Architecture

### Frontend

```
src/
├── components/collaboration/
│   ├── CollectionManager.tsx    # Manage shared collections
│   ├── AnnotationLayer.tsx      # Highlight and annotate articles
│   ├── CommentsPanel.tsx        # Discussion thread
│   ├── ActivityFeed.tsx         # Recent activity
│   └── ShareDialog.tsx          # Share with team members
├── services/
│   └── collaboration.ts         # Collaboration service with Socket.io
├── hooks/
│   └── useCollaboration.ts      # React hooks for collaboration
└── types/
    └── collaboration.ts         # TypeScript types
```

### Backend

```
server/
├── collaboration-routes.js      # REST API endpoints
└── socket-handler.js            # Socket.io real-time handlers
```

## API Endpoints

### Collections
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `GET /api/collections/:id` - Get collection details
- `PATCH /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection
- `POST /api/collections/:id/articles` - Add article
- `DELETE /api/collections/:id/articles/:articleId` - Remove article

### Sharing
- `POST /api/collections/:id/share` - Share collection
- `PATCH /api/collections/:id/members/:userId` - Update permission
- `DELETE /api/collections/:id/members/:userId` - Remove member

### Annotations
- `GET /api/annotations?articleId=xxx` - List annotations
- `POST /api/annotations` - Create annotation
- `PATCH /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation

### Comments
- `GET /api/comments?articleId=xxx` - List comments
- `POST /api/comments` - Create comment
- `PATCH /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/reactions` - Add reaction
- `DELETE /api/comments/:id/reactions/:emoji` - Remove reaction

### Activity Feed
- `GET /api/activity` - Get activity feed

### Invitations
- `GET /api/invitations` - List invitations
- `POST /api/invitations` - Create invitation
- `POST /api/invitations/:id/accept` - Accept invitation
- `POST /api/invitations/:id/decline` - Decline invitation

## Real-time Events (Socket.io)

### Client → Server
- `room:join` - Join a collection room
- `room:leave` - Leave a collection room
- `article:focus` - Track which article user is viewing
- `user:typing` - Typing indicator

### Server → Client
- `activity:new` - New activity item
- `comment:new` - New comment posted
- `comment:updated` - Comment updated
- `comment:deleted` - Comment deleted
- `annotation:new` - New annotation created
- `annotation:updated` - Annotation updated
- `annotation:deleted` - Annotation deleted
- `collection:updated` - Collection updated
- `member:joined` - New member joined
- `member:left` - Member left
- `user:presence` - Presence update

## Usage Examples

### Using Collections Hook

```tsx
import { useCollections } from '@hooks';

function MyCollections() {
  const { collections, loading, createCollection } = useCollections();

  const handleCreate = async () => {
    await createCollection({
      name: 'Diabetes Research 2024',
      description: 'Systematic review of Type 2 diabetes treatments',
      tags: ['diabetes', 'systematic-review'],
    });
  };

  // ...
}
```

### Using Annotations

```tsx
import { AnnotationLayer } from '@components/collaboration';

function ArticleViewer({ article }) {
  const contentRef = useRef<HTMLElement>(null);

  return (
    <div className="flex">
      <article ref={contentRef}>
        {/* Article content */}
      </article>
      <AnnotationLayer
        articleId={article.uid}
        contentRef={contentRef}
        currentUser={{ id: 'user1', name: 'Dr. Smith' }}
      />
    </div>
  );
}
```

### Using Comments

```tsx
import { CommentsPanel } from '@components/collaboration';

function ArticleDiscussion({ article }) {
  return (
    <CommentsPanel
      articleId={article.uid}
      currentUser={{ id: 'user1', name: 'Dr. Smith' }}
    />
  );
}
```

### Using Activity Feed

```tsx
import { ActivityFeed } from '@components/collaboration';

function Dashboard() {
  return (
    <ActivityFeed
      collectionId="coll-123"
      showFilters={true}
    />
  );
}
```

## Permission Levels

| Permission | Read | Write | Admin |
|------------|------|-------|-------|
| View articles | ✓ | ✓ | ✓ |
| Add/remove articles | ✗ | ✓ | ✓ |
| Create annotations | ✓ | ✓ | ✓ |
| Comment | ✓ | ✓ | ✓ |
| Invite members | ✗ | ✗ | ✓ |
| Manage permissions | ✗ | ✗ | ✓ |
| Delete collection | ✗ | ✗ | ✓ |

## Security Considerations

1. **Authentication**: All endpoints require authentication (mock in demo)
2. **Authorization**: Permission checks on all operations
3. **Private Annotations**: Users can keep annotations private
4. **Audit Trail**: Complete activity logging for compliance

## Future Enhancements

- [ ] Version control for annotations
- [ ] Advanced search within collections
- [ ] Export collections to PDF/Word
- [ ] Integration with reference managers
- [ ] Role-based access control templates
- [ ] Annotation categories/tags
- [ ] Full-text search in comments
- [ ] @mentions in comments
- [ ] Email notifications for mentions
- [ ] Analytics dashboard for team activity

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or start with hot reload
npm run dev
```

The collaboration features will be available at:
- Web App: http://localhost:3002
- API Docs: http://localhost:3002/api/docs/collaboration
