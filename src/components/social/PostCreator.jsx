import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Send, X, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PostCreator({ user, organizationId, onPostCreated }) {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles([...mediaFiles, ...files]);
  };

  const removeMedia = (index) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      const mediaTypes = [];

      for (const file of mediaFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
        mediaTypes.push(file.type.startsWith('video') ? 'video' : 'image');
      }

      await base44.entities.SocialPost.create({
        organization_id: organizationId,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        content: content.trim(),
        media_urls: uploadedUrls,
        media_types: mediaTypes,
        likes_count: 0,
        comments_count: 0
      });

      setContent("");
      setMediaFiles([]);
      
      // Create notification for all org members
      await base44.entities.Notification.create({
        organization_id: organizationId,
        type: "new_post",
        title: "New Post",
        message: `${user.full_name} shared a new post: "${content.trim().substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        data: {
          poster_name: user.full_name,
          poster_id: user.id
        },
        read_by: [user.id] // Mark as read for the poster
      });
      
      toast({
        title: "Post Published!",
        description: "Your post has been shared with the community.",
        duration: 3000,
      });
      
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Failed to post",
        description: "Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-2 font-medium"
              disabled={uploading}
            />
          </div>
        </div>

        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {mediaFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  {file.type.startsWith('image') ? (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex gap-2">
            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
                <span>
                  <Image className="w-4 h-4 mr-2" />
                  Photo
                </span>
              </Button>
            </label>
            <label>
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
                <span>
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </span>
              </Button>
            </label>
          </div>
          <Button 
            onClick={handlePost}
            disabled={(!content.trim() && mediaFiles.length === 0) || uploading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
          >
            <Send className="w-4 h-4 mr-2" />
            {uploading ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}