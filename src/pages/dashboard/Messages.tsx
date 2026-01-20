import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageCircle,
  Send,
  Search,
  Loader2,
  Users,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  user: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Messages() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchUsersAndConversations();
      setupRealtimeSubscription();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [profile]);

  useEffect(() => {
    if (selectedUser && profile) {
      fetchMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
    }
  }, [selectedUser, profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === profile?.id || newMsg.receiver_id === profile?.id) {
            // Update messages if in current conversation
            if (
              selectedUser &&
              (newMsg.sender_id === selectedUser.id || newMsg.receiver_id === selectedUser.id)
            ) {
              setMessages((prev) => [...prev, newMsg]);
              if (newMsg.sender_id === selectedUser.id) {
                markMessagesAsRead(selectedUser.id);
              }
            }
            // Refresh conversations
            fetchUsersAndConversations();
          }
        }
      )
      .subscribe();
  };

  const fetchUsersAndConversations = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch all users except current user
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .order('full_name');

      if (usersData) {
        setUsers(usersData);

        // Fetch messages to build conversations
        const { data: messagesData } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
          .order('created_at', { ascending: false });

        if (messagesData) {
          // Build conversations from messages
          const conversationMap = new Map<string, Conversation>();

          for (const msg of messagesData) {
            const otherId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
            const otherUser = usersData.find((u) => u.id === otherId);

            if (otherUser && !conversationMap.has(otherId)) {
              const unreadCount = messagesData.filter(
                (m) => m.sender_id === otherId && !m.is_read
              ).length;

              conversationMap.set(otherId, {
                user: otherUser,
                lastMessage: msg,
                unreadCount,
              });
            }
          }

          setConversations(Array.from(conversationMap.values()));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    if (!profile) return;

    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    if (!profile) return;

    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', profile.id)
      .eq('is_read', false);
  };

  const handleSendMessage = async () => {
    if (!profile || !selectedUser || !newMessage.trim()) return;

    setSending(true);

    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: profile.id,
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewConversation = (user: Profile) => {
    setSelectedUser(user);
    setMessages([]);
    setSearchQuery('');
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <Card className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Sidebar - Conversations & Users */}
            <div className="border-r border-border flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchQuery ? (
                  // Show search results
                  <div className="px-4 space-y-2">
                    <p className="text-xs text-muted-foreground px-2 mb-2">Search Results</p>
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => startNewConversation(user)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {user.full_name || user.email}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  // Show conversations
                  <div className="px-4 space-y-2">
                    {conversations.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Search for users to start chatting</p>
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv.user.id}
                          onClick={() => setSelectedUser(conv.user)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                            selectedUser?.id === conv.user.id
                              ? 'bg-primary/10'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.user.avatar_url || undefined} />
                            <AvatarFallback>
                              {conv.user.full_name?.charAt(0) || conv.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {conv.user.full_name || conv.user.email}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage?.content || 'No messages'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col h-full">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-border p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isSent = msg.sender_id === profile?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isSent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                <span className="text-xs">
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </span>
                                {isSent && (
                                  msg.is_read ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t border-border p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        size="icon"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a user to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
