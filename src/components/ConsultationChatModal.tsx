import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, query, orderBy, onSnapshot, addDoc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'stylist' | 'admin';
  text: string;
  imageUrl?: string;
  createdAt: any;
}

interface ConsultationChatModalProps {
  appointmentId: string;
  clientName: string;
  stylistName: string;
  serviceName: string;
  date: string;
  isStylistView?: boolean;
  onClose: () => void;
}

export function ConsultationChatModal({
  appointmentId,
  clientName,
  stylistName,
  serviceName,
  date,
  isStylistView = false,
  onClose
}: ConsultationChatModalProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formulaNotes, setFormulaNotes] = useState('');
  const [savingFormula, setSavingFormula] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize consultation document and listen for real-time messages
  useEffect(() => {
    if (!appointmentId) return;

    const consultRef = doc(db, 'consultations', appointmentId);

    // Fetch or create initial consultation doc
    const initDoc = async () => {
      const snap = await getDoc(consultRef);
      if (!snap.exists()) {
        await setDoc(consultRef, {
          appointmentId,
          clientName,
          stylistName,
          serviceName,
          date,
          formulaNotes: '',
          updatedAt: serverTimestamp()
        });
      } else {
        setFormulaNotes(snap.data().formulaNotes || '');
      }
    };

    initDoc();

    // Listen for messages subcollection
    const messagesQuery = query(
      collection(db, 'consultations', appointmentId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.warn("Messages snapshot ended:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [appointmentId]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File Picker to Base64 conversion
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !imagePreview) return;

    const currentRole = isStylistView ? 'stylist' : (profile?.role || 'client');
    const senderName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

    try {
      await addDoc(collection(db, 'consultations', appointmentId, 'messages'), {
        senderId: user?.uid || 'anonymous',
        senderName,
        senderRole: currentRole,
        text: textInput.trim(),
        imageUrl: imagePreview || null,
        createdAt: serverTimestamp()
      });

      // Update parent consultation document timestamp
      await updateDoc(doc(db, 'consultations', appointmentId), {
        updatedAt: serverTimestamp()
      });

      setTextInput('');
      setImagePreview(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Save Private Formula Notes
  const handleSaveFormula = async () => {
    setSavingFormula(true);
    try {
      await updateDoc(doc(db, 'consultations', appointmentId), {
        formulaNotes,
        updatedAt: serverTimestamp()
      });
      alert('Private formula notes saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save formula notes.');
    } finally {
      setSavingFormula(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col border border-outline/20 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-surface-container-low px-6 py-4 border-b border-outline/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-md text-base text-on-surface">Consultation Chat</h3>
                <span className={`text-[10px] font-label-caps uppercase px-2 py-0.5 rounded ${
                  isStylistView ? 'bg-tertiary-container text-on-tertiary-container font-bold' : 'bg-primary-container text-on-primary-container'
                }`}>
                  {isStylistView ? 'Stylist Portal' : 'Client View'}
                </span>
              </div>
              <p className="text-xs text-secondary">
                {serviceName} • {isStylistView ? `Client: ${clientName}` : `Stylist: ${stylistName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-secondary transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Private Hair Formula Section (Stylist View Only) */}
        {isStylistView && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>Private Hair Color & Technical Formula Notes</span>
              </div>
              <button
                onClick={handleSaveFormula}
                disabled={savingFormula}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {savingFormula ? 'Saving...' : 'Save Formula'}
              </button>
            </div>
            <textarea
              value={formulaNotes}
              onChange={(e) => setFormulaNotes(e.target.value)}
              placeholder="e.g. Redken Shades EQ 09N + 09V, Developer 10vol. Target: Warm Champagne Balayage..."
              className="w-full text-xs p-2.5 bg-surface/80 border border-amber-500/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              rows={2}
            />
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-bright/30">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              </div>
              <p className="text-sm font-semibold text-on-surface mb-1">Start Consultation & Share Inspiration</p>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                {isStylistView
                  ? 'Answer client questions or request hair history photos prior to their appointment.'
                  : 'Upload hair inspiration photos or ask your stylist questions about your upcoming session!'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.uid || (isStylistView && (msg.senderRole === 'stylist' || msg.senderRole === 'admin'));
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-secondary uppercase">{msg.senderName}</span>
                    <span className="text-[9px] text-outline px-1.5 py-0.5 rounded bg-surface-container uppercase">
                      {msg.senderRole}
                    </span>
                  </div>

                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm space-y-2 ${
                    isMe
                      ? 'bg-primary text-on-primary rounded-tr-none'
                      : 'bg-surface-container-low text-on-surface border border-outline/10 rounded-tl-none'
                  }`}>
                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden max-h-60 border border-white/20">
                        <img src={msg.imageUrl} alt="Hair Inspiration Reference" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {msg.text && <p className="text-sm font-body-md whitespace-pre-wrap">{msg.text}</p>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview Area before sending */}
        {imagePreview && (
          <div className="px-6 py-2 bg-surface-container-low border-t border-outline/10 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-primary relative flex-shrink-0">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            <span className="text-xs text-secondary italic">Photo attached for consultation</span>
          </div>
        )}

        {/* Message Input Footer */}
        <form onSubmit={handleSendMessage} className="p-4 bg-surface border-t border-outline/10 flex items-center gap-3">
          <label className="p-2 text-secondary hover:text-primary hover:bg-surface-variant rounded-full cursor-pointer transition-colors" title="Attach Hair Inspiration Photo">
            <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </label>

          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isStylistView ? "Reply to client or offer hair prep advice..." : "Ask questions or describe your hair goals..."}
            className="flex-1 bg-surface-container-low border border-outline/20 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <button
            type="submit"
            disabled={!textInput.trim() && !imagePreview}
            className="bg-primary text-on-primary p-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
