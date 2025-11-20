import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Send, Trash2, Facebook, Twitter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";

export default function SocialPostCard({ post, user, canDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.SocialComment.filter({ post_id: post.id }, '-created_date'),
    enabled: showComments,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['likes', post.id],
    queryFn: () => base44.entities.SocialLike.filter({ post_id: post.id }),
  });

  const userLiked = likes.some(like => like.user_id === user.id);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (userLiked) {
        const userLike = likes.find(like => like.user_id === user.id);
        await base44.entities.SocialLike.delete(userLike.id);
        await base44.entities.SocialPost.update(post.id, {
          likes_count: Math.max(0, post.likes_count - 1)
        });
      } else {
        await base44.entities.SocialLike.create({
          post_id: post.id,
          user_id: user.id,
          user_name: user.full_name
        });
        await base44.entities.SocialPost.update(post.id, {
          likes_count: post.likes_count + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['likes', post.id]);
      queryClient.invalidateQueries(['social-posts']);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.SocialComment.create({
        post_id: post.id,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        content: commentText
      });
      await base44.entities.SocialPost.update(post.id, {
        comments_count: post.comments_count + 1
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries(['comments', post.id]);
      queryClient.invalidateQueries(['social-posts']);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const postComments = await base44.entities.SocialComment.filter({ post_id: post.id });
      await Promise.all(postComments.map(c => base44.entities.SocialComment.delete(c.id)));
      const postLikes = await base44.entities.SocialLike.filter({ post_id: post.id });
      await Promise.all(postLikes.map(l => base44.entities.SocialLike.delete(l.id)));
      await base44.entities.SocialPost.delete(post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-posts']);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await base44.entities.SocialComment.delete(commentId);
      await base44.entities.SocialPost.update(post.id, {
        comments_count: Math.max(0, post.comments_count - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', post.id]);
      queryClient.invalidateQueries(['social-posts']);
    },
  });

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(post.content.substring(0, 200));
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {post.user_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{post.user_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{moment(post.created_date).fromNow()}</p>
            </div>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deletePostMutation.mutate()}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {post.content && (
          <p className="text-gray-900 dark:text-white leading-relaxed">{post.content}</p>
        )}

        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media_urls.map((url, index) => (
              <div key={index} className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {post.media_types[index] === 'video' ? (
                  <video src={url} controls className="w-full max-h-96 object-contain" />
                ) : (
                  <img src={url} alt="Post media" className="w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likeMutation.mutate()}
              className={`${userLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-600`}
            >
              <Heart className={`w-4 h-4 mr-1 ${userLiked ? 'fill-current' : ''}`} />
              {post.likes_count || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-gray-500 hover:text-blue-600"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comments_count || 0}
            </Button>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={shareToFacebook} className="text-gray-500 hover:text-blue-600">
              <Facebook className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={shareToTwitter} className="text-gray-500 hover:text-sky-500">
              <Twitter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={copyLink} className="text-gray-500 hover:text-gray-700">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showComments && (
          <div className="space-y-3 pt-3 border-t">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {comment.user_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{comment.user_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{moment(comment.created_date).fromNow()}</p>
                    </div>
                    {(comment.user_id === user.id || canDelete) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        className="h-6 w-6 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
              <Button
                onClick={() => commentMutation.mutate()}
                disabled={!commentText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}