import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PlayerPostCreator({ user, profile, organizationId, onPostCreated }) {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e) => {
    setMediaFiles([...mediaFiles, ...Array.from(e.target.files)]);
  };

  const removeMedia = (index) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    setUploading(true);
    try {
      const media_urls = [];
      const media_types = [];
      for (const file of mediaFiles) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        media_urls.push(file_uri);
        media_types.push(file.type.startsWith("video") ? "video" : "image");
      }

      await base44.entities.PlayerPost.create({
        organization_id: organizationId,
        profile_id: profile.id,
        player_id: profile.player_id,
        author_user_id: user.id,
        author_name: user.full_name,
        author_photo_url: profile.photo_url || "",
        content: content.trim(),
        media_urls,
        media_types,
        likes_count: 0,
        comments_count: 0,
      });

      await base44.entities.PlayerProfile.update(profile.id, {
        posts_count: (profile.posts_count || 0) + 1,
      });

      setContent("");
      setMediaFiles([]);
      toast({ title: "Posted!", duration: 2000 });
      if (onPostCreated) onPostCreated();
    } catch (err) {
      toast({ title: "Failed to post", variant: "destructive", duration: 3000 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <Textarea
          placeholder="Share an update on your profile..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none"
          disabled={uploading}
        />
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mediaFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded overflow-hidden">
                  {file.type.startsWith("image") ? (
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Video</div>
                  )}
                </div>
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <label>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span>
                <Image className="w-4 h-4 mr-2" />
                Photo
              </span>
            </Button>
          </label>
          <Button
            onClick={handlePost}
            disabled={(!content.trim() && mediaFiles.length === 0) || uploading}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {uploading ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}