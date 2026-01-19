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
      console.error("Error loading feeds:", error);
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
      console.error("Error deleting feed:", error);
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
      console.error("Error renaming feed:", error);
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
      console.error("Error exporting OPML:", error);
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Failed to export OPML. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="text-gray-500 text-center py-12">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          {userEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Signed in as {userEmail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {feeds.length > 0 && (
            <button
              onClick={handleExportOPML}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Export OPML
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold">Feeds</h2>
        {/* Add Feed Form */}
        <AddFeedForm onSuccess={loadFeeds} />

        {/* OPML Import */}
        <OPMLImport onSuccess={loadFeeds} />

        {/* Feed List */}
        {feeds.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-lg mb-2">No feeds yet</p>
            <p className="text-sm">Add your first RSS feed above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Your Feeds ({feeds.length})</h3>
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{feed.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {feed.url}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{feedCounts[feed.id] || 0} articles</span>
                      {feed.lastFetchedAt && (
                        <span>
                          Last updated:{" "}
                          {new Date(feed.lastFetchedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {feed.lastError && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Error: {feed.lastError}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={() => handleRenameFeed(feed.id, feed.title)}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteFeed(feed.id, feed.title)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
