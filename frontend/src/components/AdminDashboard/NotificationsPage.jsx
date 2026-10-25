// frontend/src/components/adminPages/NotificationsPage.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Bell,
  Calendar,
  CloudUpload,
  ExternalLink,
  ImageIcon,
  Loader2,
  Megaphone,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell, Card, useAdminRole } from "../AdminShell";
import {
  getMyNotifications,
  sendBroadcastNotification,
  deleteNotification,
} from "../../services/api";

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const { canBroadcast, canDeleteBroadcast, isTester } = useAdminRole();
  const isReadOnly = isTester || !canBroadcast;

  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("announcement");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  // Handle local image preview & cleanup memory leaks
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  async function loadBroadcasts() {
    setLoadingHistory(true);
    try {
      const token = await getToken();
      if (!token) return;
      const all = await getMyNotifications(token);
      setRecentBroadcasts(
        Array.isArray(all) ? all.filter((n) => n.isBroadcast) : []
      );
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleFileChange(e) {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB");
      return;
    }
    setImageFile(file);
  }

  function removeSelectedImage() {
    if (isReadOnly) return;
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Broadcasting is disabled in read-only mode.");
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("message", message.trim());
      fd.append("category", category);
      if (imageFile) {
        fd.append("image", imageFile);
      }

      await sendBroadcastNotification(fd, token);
      toast.success("Broadcast announcement sent to all users!");

      // Reset form fields
      setTitle("");
      setMessage("");
      setCategory("announcement");
      removeSelectedImage();

      // Refresh list
      await loadBroadcasts();
    } catch (err) {
      toast.error(err.message || "Failed to broadcast notification");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (isReadOnly || !canDeleteBroadcast) {
      toast.error("Inspector / Tester mode: Deleting broadcasts is disabled.");
      return;
    }

    if (!window.confirm("Are you sure you want to permanently delete this notification?")) {
      return;
    }

    setDeletingId(id);
    try {
      const token = await getToken();
      await deleteNotification(id, token);
      toast.success("Notification deleted successfully");
      setRecentBroadcasts((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      toast.error(err.message || "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  }

  function getCategoryBadge(cat) {
    switch (cat) {
      case "alert":
        return "bg-destructive/15 text-destructive border-destructive/20";
      case "request_update":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-primary/15 text-primary border-primary/20";
    }
  }

  return (
    <AdminShell title="Platform Announcements" status="Broadcast Center">
      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-[460px_1fr]">
        
        {/* COMPOSER CARD */}
        <Card className="p-4 sm:p-6 h-fit">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <Megaphone className="size-5 text-primary shrink-0" /> Send Broadcast Notice
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isReadOnly
              ? "Read-only inspection mode: Broadcasting notices is disabled for this role."
              : "Published notifications will be received instantly by all registered customers and service companies."}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Title *</label>
              <input
                disabled={isReadOnly || submitting}
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="e.g. Scheduled System Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold">Category</label>
              <div className="relative">
                <select
                  disabled={isReadOnly || submitting}
                  className="w-full rounded-xl border border-input bg-card pl-3.5 pr-8 py-2.5 text-xs sm:text-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="announcement">Announcement</option>
                  <option value="alert">System Alert</option>
                  <option value="request_update">General Update</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold">Message Description *</label>
              <textarea
                rows={4}
                disabled={isReadOnly || submitting}
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                placeholder="Write the complete announcement details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* IMAGE ATTACHMENT WITH LIVE PREVIEW */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold">
                Attached Banner / Image (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={isReadOnly}
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-2">
                  <div className="relative h-36 sm:h-40 w-full overflow-hidden rounded-lg bg-black/5">
                    <img
                      src={imagePreview}
                      alt="Banner Preview"
                      className="size-full object-cover"
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                    <span className="truncate font-medium">{imageFile?.name}</span>
                    <span className="shrink-0">{(imageFile?.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isReadOnly && fileInputRef.current?.click()}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input p-5 sm:p-6 text-center transition ${
                    isReadOnly
                      ? "opacity-60 cursor-not-allowed bg-muted/20"
                      : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="rounded-full bg-muted p-2.5 transition group-hover:bg-primary/10">
                    <CloudUpload className="size-5 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {isReadOnly ? "Upload disabled in read-only mode" : "Click to upload banner image"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PNG, JPG or WEBP (Max 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || isReadOnly}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Broadcasting...
                </>
              ) : isReadOnly ? (
                <>Broadcast Disabled (Read-Only Mode)</>
              ) : (
                <>
                  <Send className="size-4" /> Broadcast Announcement
                </>
              )}
            </button>
          </form>
        </Card>

        {/* BROADCAST HISTORY ROSTER */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-border gap-1.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold">Broadcast History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Announcements published and visible across all accounts.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-semibold text-muted-foreground">
              {recentBroadcasts.length} notice{recentBroadcasts.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                Loading history...
              </div>
            ) : recentBroadcasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <Bell className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-semibold">No announcements yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send your first announcement using the composer on the left.
                </p>
              </div>
            ) : (
              recentBroadcasts.map((b) => {
                const createdAtDate = b.createdAt ? new Date(b.createdAt) : null;
                const formattedDate = createdAtDate
                  ? createdAtDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={b._id}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 transition hover:border-primary/30"
                  >
                    {/* Attached Image Thumbnail */}
                    {b.imageUrl && (
                      <a
                        href={b.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                        title="Click to view full image"
                      >
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          className="size-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <ExternalLink className="size-4 text-white" />
                        </div>
                      </a>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{b.title}</h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryBadge(
                              b.category
                            )}`}
                          >
                            {b.category?.replace("_", " ")}
                          </span>

                          {/* DELETE BUTTON */}
                          {!isReadOnly && (
                            <button
                              type="button"
                              disabled={deletingId === b._id}
                              onClick={() => handleDelete(b._id)}
                              className="rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer"
                              title="Delete notification"
                            >
                              {deletingId === b._id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed break-words">
                        {b.message}
                      </p>

                      {formattedDate && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground/80 mt-2.5 sm:mt-3 pt-2 border-t border-border/50">
                          <Calendar className="size-3 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}