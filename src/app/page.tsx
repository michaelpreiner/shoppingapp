"use client";

import { useState, useEffect, useRef } from 'react';

type Item = { id: string; name: string; isBought: boolean; locationId: string };
type Location = { id: string; name: string; items: Item[] };

export default function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const locationsRef = useRef(locations);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    fetchLocations();
    
    // Reload when coming back to the app
    const handleFocus = () => fetchLocations(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLocations(false);
      }
    };
    
    // Polling every 5 seconds to catch Siri updates while app is open
    const interval = setInterval(() => {
      fetchLocations(false);
    }, 5000);
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'de-DE';
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleVoiceCommand(transcript);
          setIsRecording(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLocations = async (showLoading = true) => {
    if (showLoading) setIsFetching(true);
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
      if (data.length > 0 && !activeTab) {
        setActiveTab(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      if (showLoading) setIsFetching(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return;
    
    let targetLocationId = activeTabRef.current;
    let itemName = command;
    
    for (const loc of locationsRef.current) {
      const locNameLower = loc.name.toLowerCase();
      if (command.toLowerCase().includes(locNameLower)) {
        targetLocationId = loc.id;
        itemName = command.replace(new RegExp(`für ${locNameLower}`, 'i'), '')
                          .replace(new RegExp(locNameLower, 'i'), '')
                          .trim();
        break;
      }
    }
    
    await addItem(itemName, targetLocationId);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch(e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const addItem = async (name: string, locationId: string) => {
    if (!name.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const newItem = { id: tempId, name, isBought: false, locationId };
    
    setLocations(prev => prev.map(loc => {
      if (loc.id === locationId) {
        return { ...loc, items: [newItem, ...loc.items] };
      }
      return loc;
    }));
    
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, locationId })
    });
    
    fetchLocations();
  };

  const toggleItem = async (itemId: string, currentStatus: boolean, locationId: string) => {
    if (itemId.startsWith('temp-')) return;

    setLocations(prev => prev.map(loc => {
      if (loc.id === locationId) {
        return {
          ...loc,
          items: loc.items.map(item => item.id === itemId ? { ...item, isBought: !currentStatus } : item)
        };
      }
      return loc;
    }));

    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBought: !currentStatus })
    });
    
    fetchLocations();
  };

  const deleteItem = async (itemId: string, locationId: string) => {
    if (itemId.startsWith('temp-')) return;

    setLocations(prev => prev.map(loc => {
      if (loc.id === locationId) {
        return { ...loc, items: loc.items.filter(item => item.id !== itemId) };
      }
      return loc;
    }));
    
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
  };

  const currentOptions = locations.find(l => l.id === activeTab)?.items || [];
  const openItems = currentOptions.filter(i => !i.isBought);
  const boughtItems = currentOptions.filter(i => i.isBought);

  return (
    <main className="container">
      <h1 className="heading-1">Einkaufsliste</h1>
      {isFetching && locations.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Lade Standorte...</p>
      ) : (
        <>
          <div className="tabs">
            {locations.map(loc => (
              <button
                key={loc.id}
                className={`tab ${activeTab === loc.id ? 'active' : ''}`}
                onClick={() => setActiveTab(loc.id)}
              >
                {loc.name}
              </button>
            ))}
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Neuer Artikel..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addItem(inputValue, activeTab);
                    setInputValue('');
                  }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  addItem(inputValue, activeTab);
                  setInputValue('');
                }}
              >
                Hinzufügen
              </button>
            </div>

            <h2 className="heading-2">Noch zu kaufen ({openItems.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {openItems.length === 0 && <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Alles erledigt! 🎉</p>}
              {openItems.map(item => (
                <div key={item.id} className="list-item">
                  <input
                    type="checkbox"
                    className="item-checkbox"
                    checked={item.isBought}
                    onChange={() => toggleItem(item.id, item.isBought, activeTab)}
                  />
                  <span className="item-text">{item.name}</span>
                  <button className="btn-icon" onClick={() => deleteItem(item.id, activeTab)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>

            {boughtItems.length > 0 && (
              <>
                <h2 className="heading-2" style={{ marginTop: '2rem' }}>Erledigt ({boughtItems.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {boughtItems.map(item => (
                    <div key={item.id} className="list-item bought">
                      <input
                        type="checkbox"
                        className="item-checkbox"
                        checked={item.isBought}
                        onChange={() => toggleItem(item.id, item.isBought, activeTab)}
                      />
                      <span className="item-text">{item.name}</span>
                      <button className="btn-icon" onClick={() => deleteItem(item.id, activeTab)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mic-btn-container">
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              aria-label="Spracheingabe"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </button>
          </div>

          {isRecording && (
            <div className="voice-overlay" onClick={toggleRecording}>
              <div className="voice-card" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div className="mic-btn recording" style={{ position: 'relative', bottom: 0, right: 0 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="22"></line>
                    </svg>
                  </div>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ich höre zu...</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Sagen Sie z.B. <strong>"Äpfel für {locations[1]?.name || 'Wien'}"</strong></p>
                <button 
                  className="btn" 
                  style={{ marginTop: '1.5rem', width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}
                  onClick={toggleRecording}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
