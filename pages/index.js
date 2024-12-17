import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChatApp() {
  // State for managing messages and input
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('');

  // Fetch messages on component mount or when users change
  useEffect(() => {
    if (currentUser) {
      fetchMessages();
      
      // Real-time subscription to new messages
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            setMessages((prevMessages) => [...prevMessages, payload.new]);
          }
        )
        .subscribe();

      // Cleanup subscription
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // Fetch existing messages
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender: currentUser,
        content: newMessage,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className='flex items-center h-screen w-screen'>
      <div className="max-w-md mx-auto p-4 bg-white shadow-lg rounded-lg">
        {/* User Configuration Section */}
        <div className="flex space-x-2 mb-4">
          <input 
            type="text"
            placeholder="名前" 
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Messages Display */}
        <div className="h-96 overflow-y-auto border rounded-md mb-4 p-2 bg-gray-50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`mb-2 p-2 rounded-md max-w-[80%] ${
                msg.sender === currentUser 
                  ? 'bg-blue-100 text-right ml-auto' 
                  : 'bg-gray-200 text-left mr-auto'
              }`}
            >
              <div className="text-xs text-gray-600 mb-1">{msg.sender}</div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>

        {/* Message Input Section */}
        <div className="flex space-x-2">
          <input 
            type="text"
            placeholder="メッセージを入力してください" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!currentUser}
          />
          <button 
            onClick={sendMessage}
            disabled={!currentUser || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </div>
    </div>
    
  );
}