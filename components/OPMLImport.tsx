"use client";

import { useState, useRef } from "react";
import {
  addFeed,
  addArticle,
  getFeedByUrl,
  updateFeed,
} from "@/lib/db-operations";
import { parseFeedFromApi, discoverFeedsFromApi, type FeedArticleData, type FeedData } from "@/lib/feed-api";

interface OPMLImportProps {
  onSuccess?: () => void;
}

export default function OPMLImport({ onSuccess }: OPMLImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseOPML = (xmlString: string): string[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid OPML file");
    }

    // Extract feed URLs from outline elements
    const outlines = xmlDoc.querySelectorAll("outline[xmlUrl], outline[xmlurl]");
    const feedUrls: string[] = [];

    outlines.forEach((outline) => {
      const url =
        outline.getAttribute("xmlUrl") || outline.getAttribute("xmlurl");
      if (url) {
        feedUrls.push(url);
      }
    });

    return feedUrls;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatus("Reading OPML file...");
    setProgress({ current: 0, total: 0 });

    try {
      // Read file
      const text = await file.text();

      // Parse OPML
      const feedUrls = parseOPML(text);

      if (feedUrls.length === 0) {
        setStatus("No feeds found in OPML file");
        setIsImporting(false);
        return;
      }

      setStatus(`Found ${feedUrls.length} feeds. Importing...`);
      setProgress({ current: 0, total: feedUrls.length });

      // Import each feed
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < feedUrls.length; i++) {
        const url = feedUrls[i];
        setProgress({ current: i + 1, total: feedUrls.length });
        setStatus(
          `Importing feed ${i + 1} of ${feedUrls.length}... (${imported} imported, ${skipped} skipped, ${failed} failed)`
        );

        try {
          // Check if feed already exists
          const existingFeed = await getFeedByUrl(url);
          if (existingFeed && existingFeed.isDeleted === 0) {
            skipped++;
            continue;
          }

          // Parse and add feed (try direct parse, then discovery)
          let feedData: FeedData | undefined;
          let feedUrl = url;

          try {
            feedData = await parseFeedFromApi(url);
          } catch (parseError) {
            const discoveredFeeds = await discoverFeedsFromApi(url);
            let parsed = false;

            for (const discoveredUrl of discoveredFeeds) {
              try {
                feedData = await parseFeedFromApi(discoveredUrl);
                feedUrl = discoveredUrl;
                parsed = true;
                break;
              } catch {
                // Try next discovered feed
              }
            }

            if (!parsed) {
              throw parseError;
            }
          }

          if (!feedData) {
            throw new Error("Failed to parse feed");
          }

          const feed = existingFeed
            ? await updateFeed(existingFeed.id, {
                title: feedData.title,
                iconUrl: feedData.iconUrl,
                isDeleted: 0,
              }).then(() => ({
                ...existingFeed,
                title: feedData.title,
                iconUrl: feedData.iconUrl,
                isDeleted: 0,
              }))
            : await addFeed({
                url: feedUrl,
                title: feedData.title,
                iconUrl: feedData.iconUrl,
              });

          // Add initial articles
          const articlePromises = feedData.articles.map((article: FeedArticleData) =>
            addArticle({
              feedId: feed.id,
              guid: article.guid,
              url: article.url,
              title: article.title,
              content: article.content,
              summary: article.summary,
              publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
            })
          );
          await Promise.all(articlePromises);

          imported++;
        } catch (error) {
          console.error(`Failed to import feed ${url}:`, error);
          failed++;
        }
      }

      setStatus(
        `Import complete! ${imported} feeds imported, ${skipped} skipped (already exist), ${failed} failed.`
      );
      setIsImporting(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Call success callback
      if (onSuccess && imported > 0) {
        setTimeout(onSuccess, 1000);
      }
    } catch (error) {
      console.error("Error importing OPML:", error);
      setStatus("Error importing OPML file. Please check the file and try again.");
      setIsImporting(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
      <h2 className="text-lg font-bold mb-3">Import OPML</h2>

      <div className="space-y-3">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".opml,.xml"
            onChange={handleFileSelect}
            disabled={isImporting}
            className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:file:bg-gray-400 disabled:file:cursor-not-allowed"
          />
        </div>

        {status && (
          <div className="text-sm">
            <div
              className={
                isImporting
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }
            >
              {status}
            </div>
            {isImporting && progress.total > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Select an OPML file exported from another RSS reader to import your
        feeds.
      </p>
    </div>
  );
}
