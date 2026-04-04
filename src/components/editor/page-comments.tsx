"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Comment = {
  _id: Id<"comments">;
  pageId: Id<"pages">;
  workspaceId: Id<"workspaces">;
  parentCommentId?: Id<"comments"> | null;
  authorId: string;
  authorName?: string;
  content: string;
  isResolved: boolean;
  resolvedAt?: number | null;
  resolvedBy?: string | null;
  editedAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

type Filter = "open" | "resolved" | "all";

function Avatar({ name }: { name?: string }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-semibold text-white select-none">
      {initials}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  editable?: boolean;
  isReply?: boolean;
  onReply: (id: Id<"comments">, authorName?: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  editable = true,
  isReply = false,
  onReply,
}: CommentItemProps) {
  const removeComment = useMutation(api.comments.remove);
  const editComment = useMutation(api.comments.edit);
  const resolveComment = useMutation(api.comments.resolve);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = currentUserId === comment.authorId;
  const canReply = editable && !isReply;
  const canResolve = editable && !isReply;
  const canEditComment = editable && isOwn;
  const canDeleteComment = editable && isOwn;

  const handleDelete = useCallback(async () => {
    try {
      await removeComment({ id: comment._id });
    } catch {
      toast.error("Failed to delete comment");
    }
  }, [comment._id, removeComment]);

  const handleEditSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    try {
      await editComment({ id: comment._id, content: trimmed });
      setEditing(false);
    } catch {
      toast.error("Failed to edit comment");
    }
  }, [comment._id, editComment, editValue]);

  const handleResolve = useCallback(async () => {
    try {
      await resolveComment({ id: comment._id, resolved: !comment.isResolved });
    } catch {
      toast.error("Failed to update comment");
    }
  }, [comment._id, comment.isResolved, resolveComment]);

  return (
    <div
      className={cn(
        "group relative flex gap-3",
        isReply && "mt-2 ml-6 md:ml-10",
        comment.isResolved && "opacity-60"
      )}
    >
      <Avatar name={comment.authorName} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {comment.authorName ?? "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
          {comment.editedAt ? (
            <span className="text-xs italic text-muted-foreground">(edited)</span>
          ) : null}
          {comment.isResolved ? (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-500">
              Resolved
            </span>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-1.5">
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  void handleEditSave();
                }

                if (event.key === "Escape") {
                  setEditing(false);
                  setEditValue(comment.content);
                }
              }}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={() => void handleEditSave()}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setEditing(false);
                  setEditValue(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
            {comment.content}
          </p>
        )}

        {!editing ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            {canReply ? (
              <button
                onClick={() => onReply(comment._id, comment.authorName)}
                className="flex min-h-[32px] items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <CornerDownRight className="h-3 w-3" />
                Reply
              </button>
            ) : null}
            {canResolve ? (
              <button
                onClick={() => void handleResolve()}
                className={cn(
                  "flex min-h-[32px] items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors",
                  comment.isResolved
                    ? "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                )}
              >
                <Check className="h-3 w-3" />
                {comment.isResolved ? "Unresolve" : "Resolve"}
              </button>
            ) : null}
            {canEditComment ? (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditValue(comment.content);
                }}
                className="flex min-h-[32px] items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            ) : null}
            {canDeleteComment ? (
              <button
                onClick={() => void handleDelete()}
                className="flex min-h-[32px] items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ReplyComposerProps {
  pageId: Id<"pages">;
  workspaceId: Id<"workspaces">;
  parentId: Id<"comments">;
  parentAuthorName?: string;
  onDone: () => void;
}

function ReplyComposer({
  pageId,
  workspaceId,
  parentId,
  parentAuthorName,
  onDone,
}: ReplyComposerProps) {
  const addComment = useMutation(api.comments.add);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await addComment({
        pageId,
        workspaceId,
        content: trimmed,
        parentCommentId: parentId,
      });
      setValue("");
      onDone();
    } catch {
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  }, [addComment, onDone, pageId, parentId, value, workspaceId]);

  return (
    <div className="mt-2 ml-6 md:ml-10">
      <textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            void handleSubmit();
          }

          if (event.key === "Escape") {
            onDone();
          }
        }}
        placeholder={parentAuthorName ? `Reply to ${parentAuthorName}...` : "Write a reply..."}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-9 text-xs"
          onClick={() => void handleSubmit()}
          disabled={!value.trim() || submitting}
        >
          Reply
        </Button>
        <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={onDone}>
          Cancel
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Ctrl/Cmd+Enter to send
        </span>
      </div>
    </div>
  );
}

interface ThreadProps {
  root: Comment;
  replies: Comment[];
  currentUserId: string | null;
  editable?: boolean;
  pageId: Id<"pages">;
  workspaceId: Id<"workspaces">;
}

function Thread({
  root,
  replies,
  currentUserId,
  editable = true,
  pageId,
  workspaceId,
}: ThreadProps) {
  const [replyingTo, setReplyingTo] = useState<{
    id: Id<"comments">;
    name?: string;
  } | null>(null);
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <CommentItem
        comment={root}
        currentUserId={currentUserId}
        editable={editable}
        onReply={(id, name) => {
          if (!editable) return;
          setReplyingTo({ id, name });
        }}
      />

      {replies.length > 0 ? (
        <button
          onClick={() => setShowReplies((current) => !current)}
          className="mt-1.5 ml-6 flex min-h-[32px] items-center gap-1 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground md:ml-10"
        >
          {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      ) : null}

      {showReplies
        ? replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              currentUserId={currentUserId}
              editable={editable}
              isReply
              onReply={() => {}}
            />
          ))
        : null}

      {editable && replyingTo ? (
        <ReplyComposer
          pageId={pageId}
          workspaceId={workspaceId}
          parentId={replyingTo.id}
          parentAuthorName={replyingTo.name}
          onDone={() => setReplyingTo(null)}
        />
      ) : null}
    </div>
  );
}

interface PageCommentsProps {
  pageId: Id<"pages">;
  workspaceId: Id<"workspaces">;
  editable?: boolean;
}

export function PageComments({
  pageId,
  workspaceId,
  editable = true,
}: PageCommentsProps) {
  const addComment = useMutation(api.comments.add);
  const result = useQuery(api.comments.listByPage, { pageId });

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");
  const [newComment, setNewComment] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const comments: Comment[] = result?.comments ?? [];
  const currentUserId = result?.currentUserId ?? null;

  const roots = comments.filter((comment) => !comment.parentCommentId);
  const getReplies = (id: Id<"comments">) =>
    comments.filter((comment) => comment.parentCommentId === id);

  const filteredRoots = roots.filter((comment) => {
    if (filter === "open") return !comment.isResolved;
    if (filter === "resolved") return comment.isResolved;
    return true;
  });

  const openCount = roots.filter((comment) => !comment.isResolved).length;
  const totalCount = roots.length;

  const handleSubmit = useCallback(async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await addComment({ pageId, workspaceId, content: trimmed });
      setNewComment("");
      setComposerFocused(false);
      setOpen(true);
      setFilter("open");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }, [addComment, newComment, pageId, workspaceId]);

  return (
    <div className="mt-16 border-t border-border/60 pt-6">
      <button
        onClick={() => setOpen((current) => !current)}
        className="mb-4 flex min-h-[40px] w-full items-center gap-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {totalCount === 0
            ? "Comments"
            : `${openCount > 0 ? `${openCount} open` : ""}${
                openCount > 0 && totalCount - openCount > 0 ? " · " : ""
              }${
                totalCount - openCount > 0 ? `${totalCount - openCount} resolved` : ""
              }`}
        </span>
        {open ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
      </button>

      {editable ? (
        <div className="mb-4 flex gap-3">
          <Avatar name="You" />
          <div className="min-w-0 flex-1">
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              onFocus={() => setComposerFocused(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  void handleSubmit();
                }

                if (event.key === "Escape") {
                  setComposerFocused(false);
                  setNewComment("");
                }
              }}
              placeholder="Add a comment..."
              rows={composerFocused ? 3 : 1}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {composerFocused ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => void handleSubmit()}
                  disabled={!newComment.trim() || submitting}
                >
                  Comment
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => {
                    setComposerFocused(false);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
                <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                  Ctrl/Cmd+Enter to send
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          You can read comment threads in this shared page, but only editors can add, reply, or resolve comments.
        </div>
      )}

      {open && totalCount > 0 ? (
        <div>
          <div className="mb-4 flex items-center gap-1 border-b border-border/60 pb-2">
            {(["open", "resolved", "all"] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "min-h-[32px] rounded-md px-3 py-1.5 text-xs capitalize transition-colors",
                  filter === value
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {value}
                {value === "open" && openCount > 0 ? (
                  <span className="ml-1 text-xs opacity-60">{openCount}</span>
                ) : null}
              </button>
            ))}
          </div>

          {filteredRoots.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No {filter !== "all" ? filter : ""} comments
            </p>
          ) : (
            <div>
              {filteredRoots.map((root) => (
                <Thread
                  key={root._id}
                  root={root}
                  replies={getReplies(root._id)}
                  currentUserId={currentUserId}
                  editable={editable}
                  pageId={pageId}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
