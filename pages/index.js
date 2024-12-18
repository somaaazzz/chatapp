import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// latency
const MS = 2000;

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChatApp() {
  // State for managing messages and input
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  
  // Ref for the messages container
  const messagesEndRef = useRef(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    const start = Date.now();
    // artificial latency
    while (Date.now() - start < MS) {
      // Busy-wait loop to block execution
    }

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
      setNewMessage('')
    }
  };

  return (
    <div className='flex flex-col h-screen w-screen bg-gray-100 p-4'>
      {/* User Configuration Section */}
      <div className="w-full max-w-4xl mx-auto mb-4">
        <input 
          type="text"
          placeholder="名前を入力してください" 
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
          className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        />
      </div>

      {/* Messages Display */}
      <div className="flex-grow w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${
                msg.sender === currentUser 
                  ? 'items-end' 
                  : 'items-start'
              }`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.sender === currentUser 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-black'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                <div>{msg.content}</div>
              </div>
            </div>
          ))}
          {/* Invisible div to help with scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input Section */}
      <div className="w-full max-w-4xl mx-auto mt-4 flex space-x-2">
        <input 
          type="text"
          placeholder="メッセージを入力してください" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          disabled={!currentUser}
        />
        <button 
          onClick={sendMessage}
          disabled={!currentUser || !newMessage.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg"
        >
          送信
        </button>
      </div>
    </div>
  );
}