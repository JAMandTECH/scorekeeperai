import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";

export default function PlayerPostCard({ post, canDelete, onDelete }) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <Link to={`/PlayerProfileView?profile_id=${post.profile_id}`} className="flex gap-3 items-center group">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading font-bold text-sm overflow-hidden flex-shrink-0">
              {post.author_photo_url ? (
                <img src={post.author_photo_url} alt={post.author_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground">{post.author_name?.charAt(0)?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="font-heading font-bold text-sm group-hover:text-primary transition-colors">{post.author_name}</p>
              <p className="text-xs text-muted-foreground">{moment(post.created_date).fromNow()}</p>
            </div>
          </Link>
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {post.content && <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>}

        {post.media_urls?.length > 0 && (
          <div className={`grid gap-2 ${post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {post.media_urls.map((url, index) => (
              <div key={index} className="rounded overflow-hidden bg-muted">
                {post.media_types?.[index] === "video" ? (
                  <video src={url} controls className="w-full max-h-96 object-contain" />
                ) : (
                  <img src={url} alt="" className="w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">{post.likes_count || 0} likes</span>
          <Button variant="ghost" size="icon" onClick={handleCopyLink} className="text-muted-foreground">
            <Link2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}