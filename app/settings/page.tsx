"use client";

import { useState, useEffect } from "react";
import { getAllFeeds, deleteFeed, updateFeed, getArticleCountsByFeed } from "@/lib/db-operations";
import type { Feed } from "@/lib/types";
import AddFeedForm from "@/components/AddFeedForm";
import OPMLImport from "@/components/OPMLImport";
import { exportOPML } from "@/lib/opml-export";
import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";
import AlertDialog from "@/components/AlertDialog";
import { supabase } from "@/lib/supabase/client";
import { uiLogger } from "@/lib/logger";
import { emptyStateClass } from "@/components/ui/classes";

export default function Settings() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedCounts, setFeedCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Modal states
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; feedId: string; feedTitle: string }>({
    isOpen: false,
    feedId: "",
    feedTitle: "",
  });
  const [renameDialog, setRenameDialog] = useState<{ isOpen: boolean; feedId: string; currentTitle: string }>({
    isOpen: false,
    feedId: "",
    currentTitle: "",
  });
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const loadFeeds = async () => {
    setIsLoading(true);
    try {
      const [feedsData, counts] = await Promise.all([
        getAllFeeds(),
        getArticleCountsByFeed(),
      ]);
      setFeeds(feedsData);
      setFeedCounts(counts);
    } catch (error) {
      uiLogger.error("Error loading feeds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteFeed = (id: string, title: string) => {
    setDeleteDialog({ isOpen: true, feedId: id, feedTitle: title });
  };

  const confirmDeleteFeed = async () => {
    try {
      await deleteFeed(deleteDialog.feedId);
      setDeleteDialog({ isOpen: false, feedId: "", feedTitle: "" });
      loadFeeds();
    } catch (error) {
      uiLogger.error("Error deleting feed:", error);
      setDeleteDialog({ isOpen: false, feedId: "", feedTitle: "" });
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Failed to delete feed. Please try again.",
      });
    }
  };

  const handleRenameFeed = (id: string, currentTitle: string) => {
    setRenameDialog({ isOpen: true, feedId: id, currentTitle });
  };

  const confirmRenameFeed = async (newTitle: string) => {
    if (newTitle === renameDialog.currentTitle) {
      setRenameDialog({ isOpen: false, feedId: "", currentTitle: "" });
      return;
    }

    try {
      await updateFeed(renameDialog.feedId, { title: newTitle });
      setRenameDialog({ isOpen: false, feedId: "", currentTitle: "" });
      loadFeeds();
    } catch (error) {
      uiLogger.error("Error renaming feed:", error);
      setRenameDialog({ isOpen: false, feedId: "", currentTitle: "" });
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Failed to rename feed. Please try again.",
      });
    }
  };

  const handleExportOPML = async () => {
    try {
      await exportOPML(feeds);
    } catch (error) {
      uiLogger.error("Error exporting OPML:", error);
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Failed to export OPML. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6 tracking-tight">Settings</h1>
        <div className="text-[var(--muted)] text-center py-12">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          {userEmail && (
            <p className="text-sm text-[var(--muted)] mt-1">
              Signed in as {userEmail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {feeds.length > 0 && (
            <button
              onClick={handleExportOPML}
              className="px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--foreground)] rounded hover:bg-[var(--border)] transition-colors"
            >
              Export OPML
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--muted)] rounded hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Add Feed Form */}
        <AddFeedForm onSuccess={loadFeeds} />

        {/* OPML Import */}
        <OPMLImport onSuccess={loadFeeds} />

        {/* Feed List */}
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--muted)] mb-4">
            Your Feeds {feeds.length > 0 && `(${feeds.length})`}
          </h2>

          {feeds.length === 0 ? (
            <div className={`${emptyStateClass} flex flex-col items-center`}>
              <p className="text-base font-medium mb-1">No feeds yet</p>
              <p className="text-sm text-[var(--muted)]">
                Add your first RSS feed above to get started
              </p>
            </div>
          ) : (
            <div className="border-t border-[var(--border)]">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="py-4 border-b border-[var(--border)] hover:bg-[var(--border)]/30 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4 px-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--foreground)] truncate">{feed.title}</h3>
                      <p className="text-sm text-[var(--muted)] mt-0.5 truncate">
                        {feed.url}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--muted)]">
                        <span>{feedCounts[feed.id] || 0} articles</span>
                        {feed.lastFetchedAt && (
                          <>
                            <span>·</span>
                            <span>
                              Updated {new Date(feed.lastFetchedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      {feed.lastError && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                          Error: {feed.lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRenameFeed(feed.id, feed.title)}
                        className="px-2.5 py-1 text-xs border border-[var(--border)] text-[var(--muted)] rounded hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteFeed(feed.id, feed.title)}
                        className="px-2.5 py-1 text-xs text-red-600 border border-red-200 dark:border-red-900 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Feed"
        message={`Are you sure you want to delete "${deleteDialog.feedTitle}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteFeed}
        onCancel={() => setDeleteDialog({ isOpen: false, feedId: "", feedTitle: "" })}
      />

      <PromptDialog
        isOpen={renameDialog.isOpen}
        title="Rename Feed"
        defaultValue={renameDialog.currentTitle}
        placeholder="Enter new feed name"
        confirmLabel="Rename"
        cancelLabel="Cancel"
        onConfirm={confirmRenameFeed}
        onCancel={() => setRenameDialog({ isOpen: false, feedId: "", currentTitle: "" })}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmLabel="OK"
        onClose={() => setAlertDialog({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}
