import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Trophy, MessageCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import moment from "moment";

export default function NotificationBell({ user, organizationId }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', organizationId],
    queryFn: () => base44.entities.Notification.filter(
      { organization_id: organizationId },
      '-created_date',
      50
    ),
    enabled: !!organizationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notifications.filter(
    n => !n.read_by?.includes(user?.id)
  ).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;
      
      const readBy = notification.read_by || [];
      if (!readBy.includes(user?.id)) {
        await base44.entities.Notification.update(notificationId, {
          read_by: [...readBy, user?.id]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', organizationId]);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(
        n => !n.read_by?.includes(user?.id)
      );
      
      await Promise.all(
        unreadNotifications.map(n => 
          base44.entities.Notification.update(n.id, {
            read_by: [...(n.read_by || []), user?.id]
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', organizationId]);
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'new_post':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'game_completed':
        return <Trophy className="w-4 h-4 text-orange-500" />;
      case 'team_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'team_rejected':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'new_post':
        return 'bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'game_completed':
        return 'bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      case 'team_approved':
        return 'bg-green-100 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'team_rejected':
        return 'bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-purple-500/10 rounded-xl"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => {
                const isRead = notification.read_by?.includes(user?.id);
                return (
                  <div
                    key={notification.id}
                    onClick={() => !isRead && markAsReadMutation.mutate(notification.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isRead 
                        ? 'bg-white dark:bg-gray-900 opacity-70' 
                        : 'bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold text-gray-900 dark:text-white ${!isRead ? 'font-bold' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.data?.score && (
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-bold">
                              {notification.data.homeTeam} {notification.data.homeScore} - {notification.data.awayScore} {notification.data.awayTeam}
                            </Badge>
                          </div>
                        )}
                        {notification.data?.bestPlayer && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                            ⭐ MVP: {notification.data.bestPlayer}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {moment(notification.created_date).fromNow()}
                        </p>
                      </div>
                      {!isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}