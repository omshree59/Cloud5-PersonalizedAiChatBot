"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Menu, Plus, Mic, Image as ImageIcon, Compass, Lightbulb, Code, Loader2, MessageSquare, LogOut, Users, X, BrainCircuit } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { auth, db } from "../firebase"; 
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, arrayUnion, query, orderBy } from "firebase/firestore";

export default function Cloud5Chat() {
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [user, setUser] = useState(null); 
  const [greeting, setGreeting] = useState("Hello");
  const [videoBg, setVideoBg] = useState("/morning.mp4");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [chatsList, setChatsList] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  
  const [lastImageDate, setLastImageDate] = useState(null);
  const [visionStats, setVisionStats] = useState({ date: null, count: 0 });

  const [activePersona, setActivePersona] = useState("default");

  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  // --- NEW: Load guest count from Local Storage on mount ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCount = localStorage.getItem("cloud5_guest_count");
      if (storedCount) {
        setMessageCount(parseInt(storedCount, 10));
      }
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) { setGreeting("Good morning"); setVideoBg("/morning.mp4"); } 
    else if (hour < 17) { setGreeting("Good afternoon"); setVideoBg("/afternoon.mp4"); } 
    else { setGreeting("Good evening"); setVideoBg("/evening.mp4"); }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
           const data = userDocSnap.data();
           if (data.lastImageDate) setLastImageDate(data.lastImageDate);
           if (data.visionStats) setVisionStats(data.visionStats);
        } else {
           await setDoc(userDocRef, { lastImageDate: null, visionStats: { date: null, count: 0 } }, { merge: true });
        }
        
        const q = query(collection(db, "users", currentUser.uid, "chats"), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedChats = [];
        querySnapshot.forEach((doc) => { fetchedChats.push({ id: doc.id, ...doc.data() }); });
        setChatsList(fetchedChats);
        
        if (fetchedChats.length > 0) {
          setCurrentChatId(fetchedChats[0].id);
          setMessages(fetchedChats[0].messages || []);
        } else {
          setMessages([]); setCurrentChatId(null);
        }
      } else {
        setMessages([]); 
        setChatsList([]); 
        setCurrentChatId(null); 
        
        // --- FIXED: Read from local storage instead of resetting to 0 on logout ---
        if (typeof window !== "undefined") {
            const storedCount = localStorage.getItem("cloud5_guest_count");
            setMessageCount(storedCount ? parseInt(storedCount, 10) : 0);
        }
        
        setLastImageDate(null); 
        setVisionStats({ date: null, count: 0 });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setSelectedImage(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleLogin = async (promptSelectAccount = false) => {
    const provider = new GoogleAuthProvider();
    if (promptSelectAccount) { provider.setCustomParameters({ prompt: 'select_account' }); }
    try { await signInWithPopup(auth, provider); setIsUserMenuOpen(false); } catch (error) { console.error("Login failed:", error); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setIsUserMenuOpen(false); } catch (error) { console.error("Logout failed:", error); }
  };

  const handleNewChat = () => {
    setMessages([]); setCurrentChatId(null); setIsSidebarOpen(false); setSelectedImage(null);
  };

  const selectChat = (chatId) => {
     const selected = chatsList.find(c => c.id === chatId);
     if (selected) {
        setCurrentChatId(chatId); setMessages(selected.messages || []); setIsSidebarOpen(false); setSelectedImage(null);
     }
  };

  const sendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    if (!user && messageCount >= 2) return;

    const textToSend = customText || input;
    if (!textToSend.trim() && !selectedImage) return;

    if (textToSend.trim().toLowerCase() === "create image") {
        setMessages(prev => [...prev, { role: "user", content: textToSend }, { role: "ai", content: "What would you like me to draw? (For example: 'Generate an image of a cat in a wizard hat')" }]);
        setInput("");
        return;
    }

    let chatIdToUse = currentChatId;
    let isNewChat = false;
    if (!chatIdToUse && user) {
       chatIdToUse = Date.now().toString(); 
       setCurrentChatId(chatIdToUse); isNewChat = true;
    }

    const userMsg = { role: "user", content: textToSend, userImage: selectedImage };
    setMessages((prev) => [...prev, userMsg]);
    
    const capturedImage = selectedImage; 
    setInput(""); setSelectedImage(null); setIsLoading(true);
    
    // --- FIXED: Save the incremented count securely to Local Storage ---
    if (!user) {
        setMessageCount(prev => {
            const newCount = prev + 1;
            localStorage.setItem("cloud5_guest_count", newCount.toString());
            return newCount;
        });
    }

    if (user) {
      const chatRef = doc(db, "users", user.uid, "chats", chatIdToUse);
      if (isNewChat) {
         const newChatData = { title: (textToSend || "Image Upload").substring(0, 25) + "...", messages: [userMsg], updatedAt: Date.now() };
         await setDoc(chatRef, newChatData);
         setChatsList(prev => [{ id: chatIdToUse, ...newChatData }, ...prev]);
      } else {
         await updateDoc(chatRef, { messages: arrayUnion(userMsg), updatedAt: Date.now() });
         setChatsList(prev => prev.map(c => c.id === chatIdToUse ? {...c, messages: [...c.messages, userMsg], updatedAt: Date.now()} : c).sort((a,b) => b.updatedAt - a.updatedAt));
      }
    }

    // --- VISION INTERCEPTOR ---
    if (capturedImage) {
        if (!user) {
            setMessages(prev => [...prev, { role: "ai", content: "You must be signed in to upload and analyze images! Opening secure login..." }]);
            setIsLoading(false); handleGoogleLogin(false); return;
        }

        const today = new Date().toDateString();
        let currentCount = visionStats.date === today ? visionStats.count : 0;

        if (currentCount >= 3) {
            setMessages(prev => [...prev, { role: "ai", content: "You have reached your limit of 3 image uploads per day. Please try again tomorrow!" }]);
            setIsLoading(false); return;
        }

        try {
            const res = await fetch("/api/vision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: textToSend, imageBase64: capturedImage })
            });
            const data = await res.json();
            const aiMsg = { role: "ai", content: data.answer || data.error };
            setMessages(prev => [...prev, aiMsg]);

            if (user) {
                const chatRef = doc(db, "users", user.uid, "chats", chatIdToUse);
                await updateDoc(chatRef, { messages: arrayUnion(aiMsg), updatedAt: Date.now() });

                const newVisionStats = { date: today, count: currentCount + 1 };
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, { visionStats: newVisionStats }, { merge: true });
                setVisionStats(newVisionStats);
            }
        } catch(e) {
            setMessages((prev) => [...prev, { role: "ai", content: "Failed to read the image." }]);
        } finally {
            setIsLoading(false);
        }
        return; 
    }

    // --- IMAGE GENERATION INTERCEPTOR ---
    const isImageGenRequest = /^(generate|create|make|draw|paint)\s+(an\s+|a\s+)?(image|picture|pic|photo|drawing|art)/i.test(textToSend);

    if (isImageGenRequest) {
        if (!user) {
            setMessages(prev => [...prev, { role: "ai", content: "You must be signed in to generate images! Opening secure login..." }]);
            setIsLoading(false); handleGoogleLogin(false); return;
        }

        const today = new Date().toDateString();
        if (lastImageDate === today) {
            setMessages(prev => [...prev, { role: "ai", content: "You have reached your limit of 1 image generation per day. Please try again tomorrow!" }]);
            setIsLoading(false); return;
        }

        try {
           const response = await fetch("/api/image", { 
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: textToSend }),
           });
           const data = await response.json();
           if (data.error) throw new Error(data.error);

           let imageSrc = data.image;
           if (!imageSrc.startsWith("http") && !imageSrc.startsWith("data:")) { imageSrc = `data:image/png;base64,${data.image}`; }

           const aiMsgUI = { role: "ai", content: "Here is your generated image:", image: imageSrc };
           setMessages(prev => [...prev, aiMsgUI]);
           setIsLoading(false);

           const formData = new FormData();
           formData.append("file", imageSrc);
           
           formData.append("upload_preset", "cloud5"); 
           const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dswljz9rr/image/upload"; 

           const cloudinaryRes = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
           const cloudinaryData = await cloudinaryRes.json();
           
           if (!cloudinaryData.secure_url) throw new Error("Cloudinary upload failed");
           const permanentUrl = cloudinaryData.secure_url; 

           const userDocRef = doc(db, "users", user.uid);
           await setDoc(userDocRef, { lastImageDate: today }, { merge: true });
           setLastImageDate(today);

           const dbAiMsg = { role: "ai", content: `Here is your generated image:`, image: permanentUrl };
           const chatRef = doc(db, "users", user.uid, "chats", chatIdToUse);
           await updateDoc(chatRef, { messages: arrayUnion(dbAiMsg), updatedAt: Date.now() });

        } catch(e) {
           console.error(e);
           setMessages((prev) => [...prev, { role: "ai", content: "Failed to generate image. Please try again later." }]);
           setIsLoading(false);
        }
        return; 
    }

    // --- STANDARD TEXT CHAT ---
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: textToSend, 
            persona: activePersona
        }),
      });
      const data = await response.json();
      const aiMsg = { role: "ai", content: data.answer || data.error };
      setMessages((prev) => [...prev, aiMsg]);

      if (user) {
        const chatRef = doc(db, "users", user.uid, "chats", chatIdToUse);
        await updateDoc(chatRef, { messages: arrayUnion(aiMsg), updatedAt: Date.now() });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "Error connecting to servers." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasStartedChat = messages.length > 0;
  const isLimitReached = !user && messageCount >= 2;

  const suggestions = [
    { icon: <ImageIcon size={18} />, text: "Create image" },
    { icon: <Compass size={18} />, text: "Explore ideas" },
    { icon: <Lightbulb size={18} />, text: "Get inspired" },
    { icon: <Code size={18} />, text: "Help me code" },
  ];

  return (
    <div className="flex flex-col h-screen relative overflow-hidden font-sans text-gray-200">
      
      <video key={videoBg} autoPlay loop muted playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover z-0 bg-[#131314]">
        <source src={videoBg} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#131314]/50 z-0"></div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#1e1f20] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Menu size={24} className="text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Cloud5 Logo" className="w-10 h-10 object-contain drop-shadow-md" />
            <span className="text-xl font-medium text-gray-200 tracking-wide">Cloud5</span>
          </div>
        </div>
        
        <div className="px-4 py-2 mt-2">
          <button onClick={handleNewChat} className="flex items-center gap-3 bg-[#2a2b2e] hover:bg-[#333538] text-gray-200 px-4 py-3 rounded-full w-full transition-colors text-sm font-medium shadow-sm border border-white/5">
            <Plus size={18} /> New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2 uppercase tracking-wider">Recent</h3>
          
          {!user ? (
            <p className="text-sm text-gray-500 px-2">Sign in to save your history.</p>
          ) : chatsList.length > 0 ? (
            <div className="space-y-1">
              {chatsList.map((chat) => (
                <button 
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors text-sm text-left truncate border ${currentChatId === chat.id ? 'bg-[#2a2b2e] border-white/10 text-gray-200' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400 hover:text-gray-300'}`}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          ) : (
             <p className="text-sm text-gray-500 px-2">No recent chats.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col h-full z-10 relative">
        <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Menu size={24} className="text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
               <img src="/logo.png" alt="Cloud5 Logo" className="w-10 h-10 object-contain drop-shadow-md" />
               <h1 className="text-xl font-medium text-gray-200 tracking-wide hidden sm:block">Cloud5</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            
            <div className="relative flex items-center bg-[#1e1f20]/80 backdrop-blur-md border border-gray-700/50 rounded-full px-3 py-1.5 shadow-sm">
                <BrainCircuit size={16} className="text-gray-400 mr-2" />
                <select 
                    value={activePersona} 
                    onChange={(e) => setActivePersona(e.target.value)}
                    className="bg-transparent border-none text-sm text-gray-200 outline-none cursor-pointer focus:ring-0 appearance-none pr-4"
                >
                    <option value="default" className="bg-[#1e1f20] text-gray-200">Default Cloud5</option>
                    <option value="mentor" className="bg-[#1e1f20] text-gray-200">Coding Mentor</option>
                    <option value="sustainability" className="bg-[#1e1f20] text-gray-200">Sustainability Expert</option>
                    <option value="writer" className="bg-[#1e1f20] text-gray-200">Creative Writer</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>

            {!user ? (
              <button onClick={() => handleGoogleLogin(false)} className="bg-[#c2e7ff] hover:bg-[#a8d6f5] text-[#001d35] px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm">
                Sign In
              </button>
            ) : (
              <div className="relative">
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="focus:outline-none flex items-center">
                  <img src={user.photoURL || "https://ui-avatars.com/api/?name=User"} alt="Profile" className={`w-10 h-10 rounded-full border-2 transition-all shadow-md ${isUserMenuOpen ? 'border-blue-400' : 'border-gray-700 hover:border-gray-500'}`} />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-64 bg-[#1e1f20] rounded-2xl shadow-2xl border border-gray-700/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-5 py-3 border-b border-gray-700/50 mb-1">
                        <p className="text-sm font-bold text-gray-200 truncate">{user.displayName}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                      </div>
                      <button onClick={() => handleGoogleLogin(true)} className="w-full text-left px-5 py-3 text-sm text-gray-300 hover:bg-[#2a2b2e] transition-colors flex items-center gap-3">
                        <Users size={16} className="text-gray-400" />
                        Switch Account
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-[#2a2b2e] transition-colors flex items-center gap-3">
                        <LogOut size={16} className="text-red-400" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {!hasStartedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto pb-20 overflow-y-auto">
              <div className="w-full max-w-3xl flex flex-col items-start mb-10 pl-2">
                <div className="flex items-center gap-2 mb-3">
                   <img src="/logo.png" alt="Cloud5 Logo" className="w-16 h-16 object-contain drop-shadow-xl" />
                   <h2 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent pb-2">
                     {greeting}, {user ? (user.displayName ? user.displayName.split(' ')[0].toUpperCase() : 'USER') : 'GUEST'}
                   </h2>
                </div>
                <h3 className="text-4xl md:text-5xl font-medium text-[#c4c7c5]">
                  How can I help you Today?
                </h3>
              </div>

              <div className="w-full max-w-3xl">
                {isLimitReached ? (
                  <div className="bg-[#1e1f20]/90 backdrop-blur-md rounded-[2rem] p-8 text-center border border-gray-700/50 shadow-2xl">
                    <h3 className="text-xl font-bold text-gray-200 mb-2">Free Limit Reached</h3>
                    <p className="text-gray-400 text-sm mb-6">You have used your 2 free chats. Sign in to continue talking to Cloud5!</p>
                    <button onClick={() => handleGoogleLogin(false)} className="flex items-center justify-center gap-3 mx-auto bg-white hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-full font-semibold transition-all">
                      Continue with Google
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#1e1f20]/90 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 shadow-2xl focus-within:bg-[#252628]/95 transition-colors flex flex-col gap-2 relative">
                    
                    {selectedImage && (
                       <div className="mb-3 relative inline-block">
                          <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-600" />
                          <button onClick={() => setSelectedImage(null)} type="button" className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700">
                             <X size={14}/>
                          </button>
                       </div>
                    )}

                    <form onSubmit={(e) => sendMessage(e)} className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Cloud5..."
                        disabled={isLoading}
                        className="w-full bg-transparent border-none focus:ring-0 px-2 pt-2 pb-4 text-gray-200 placeholder-gray-500 text-lg outline-none"
                      />
                      <div className="flex justify-between items-center px-1">
                        
                        <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors">
                          <Plus size={22} />
                        </button>
                        <input 
                           type="file" 
                           accept="image/*" 
                           ref={fileInputRef} 
                           onChange={handleFileSelect} 
                           className="hidden" 
                        />

                        <div className="flex items-center gap-2">
                          <button type="button" className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors">
                            <Mic size={22} />
                          </button>
                          {(input.trim() || selectedImage) && (
                            <button type="submit" disabled={isLoading} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors">
                              <Send size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {!isLimitReached && (
                <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-3xl">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(null, s.text)} className="flex items-center gap-2 bg-[#1e1f20]/80 backdrop-blur-md hover:bg-[#303133] px-5 py-3 rounded-xl text-sm font-medium text-gray-300 border border-gray-700/50 transition-all">
                      {s.icon} <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <div className="max-w-3xl mx-auto space-y-8 pb-32">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  
                  {msg.role === "ai" && (
                    <img src="/logo.png" alt="Cloud5 Logo" className="w-8 h-8 object-contain flex-shrink-0 mt-1 drop-shadow-md" />
                  )}

                  <div className={`px-6 py-4 max-w-[85%] rounded-3xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === "user" 
                      ? "bg-[#303133]/90 backdrop-blur-sm text-gray-100 rounded-br-sm border border-gray-700/50" 
                      : "bg-[#1e1f20]/80 backdrop-blur-md border border-gray-700/50 text-gray-100 rounded-bl-sm prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1e1f20] prose-pre:border prose-pre:border-gray-700/50 prose-a:text-blue-400 max-w-none"
                  }`}>
                  
                    {msg.role === "user" ? (
                      <div className="flex flex-col gap-3">
                         {msg.userImage && <img src={msg.userImage} alt="Uploaded" className="max-w-xs rounded-xl border border-gray-600 shadow-md" />}
                         <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                        {msg.image && (
                           <img src={msg.image} alt="AI Generated" className="mt-4 rounded-xl shadow-lg border border-gray-700/50 w-full max-w-sm" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                   <img src="/logo.png" alt="Cloud5 Logo" className="w-8 h-8 object-contain flex-shrink-0 mt-1 drop-shadow-md" />
                  <div className="px-6 py-4 flex items-center gap-3">
                    <Loader2 className="animate-spin text-gray-400" size={22} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </main>

        {hasStartedChat && (
          <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#131314] via-[#131314]/90 to-transparent">
            <div className="max-w-3xl mx-auto w-full">
              {isLimitReached ? (
                <div className="bg-[#1e1f20]/90 backdrop-blur-md rounded-3xl p-6 text-center border border-gray-700 shadow-xl">
                  <p className="text-gray-300 text-sm mb-4">You have used your 2 free chats. Sign in to continue!</p>
                  <button onClick={() => handleGoogleLogin(false)} className="mx-auto flex items-center gap-3 bg-white hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-full font-semibold transition-all">
                    Sign In with Google
                  </button>
                </div>
              ) : (
                <div className="relative bg-[#1e1f20]/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-gray-700/50 p-2 focus-within:bg-[#252628]/95 transition-colors">
                  
                  {selectedImage && (
                      <div className="absolute bottom-full left-4 mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-600 shadow-lg" />
                        <button onClick={() => setSelectedImage(null)} type="button" className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700">
                            <X size={14}/>
                        </button>
                      </div>
                  )}

                  <form onSubmit={(e) => sendMessage(e)} className="flex items-center">
                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors">
                      <Plus size={22} />
                    </button>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                    />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Cloud5..."
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-gray-200 placeholder-gray-500 text-lg outline-none"
                    />
                    <button type="button" className="p-3 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors">
                      <Mic size={22} />
                    </button>
                    {(input.trim() || selectedImage) && (
                      <button type="submit" disabled={isLoading} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors ml-1 disabled:opacity-50">
                        <Send size={20} />
                      </button>
                    )}
                  </form>
                </div>
              )}
              <div className="text-center mt-3 text-xs text-gray-400 font-medium drop-shadow-md">
                Cloud5 may display inaccurate info, so double-check its responses.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}