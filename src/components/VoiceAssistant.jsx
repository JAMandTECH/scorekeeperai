import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

export default function VoiceAssistant({ 
  homePlayers = [], 
  awayPlayers = [], 
  onCommand,
  sport = "basketball"
}) {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleClick = () => {
    console.log("BUTTON CLICKED - isListening:", isListening);
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setMessage("Stopped");
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMessage("Not supported");
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          console.log("Voice:", finalTranscript);
          processCommand(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Error:", event.error);
        setMessage("Error: " + event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setMessage("Listening...");
    } catch (error) {
      console.error("Start error:", error);
      setMessage("Failed to start");
    }
  };

  const processCommand = (command) => {
    const lower = command.toLowerCase().trim();
    const isHome = lower.includes('home');
    const isAway = lower.includes('away');
    
    if (!isHome && !isAway) {
      setMessage("Say 'home' or 'away'");
      return;
    }

    const team = isHome ? 'home' : 'away';
    const players = isHome ? homePlayers : awayPlayers;

    if (!players || players.length === 0) {
      setMessage("No players");
      return;
    }

    const match = lower.match(/(\d{1,3})/);
    if (!match) {
      setMessage("No number found");
      return;
    }

    const jerseyNumber = match[1];
    const player = players.find(p => String(p.jersey_number) === jerseyNumber || parseInt(p.jersey_number) === parseInt(jerseyNumber));
    
    if (!player) {
      setMessage(`#${jerseyNumber} not found`);
      return;
    }

    let action = null;
    let value = 1;

    if (sport === "basketball") {
      if (lower.includes('3 point') || lower.includes('three')) {
        action = '3-pointer';
        value = 3;
      } else if (lower.includes('2 point') || lower.includes('two')) {
        action = '2-pointer';
        value = 2;
      } else if (lower.includes('free throw')) {
        action = 'free-throw';
        value = 1;
      } else if (lower.includes('foul')) {
        action = 'foul';
      } else if (lower.includes('rebound')) {
        action = 'rebound';
      } else if (lower.includes('assist')) {
        action = 'assist';
      } else if (lower.includes('steal')) {
        action = 'steal';
      } else if (lower.includes('block')) {
        action = 'block';
      }
    }

    if (!action) {
      setMessage("Action not recognized");
      return;
    }

    onCommand({ team, player, action, value });
    setMessage(`✓ ${player.jersey_number} ${action}`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: isListening ? '#fee' : '#eef', 
      border: '3px solid ' + (isListening ? '#f00' : '#00f'),
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <button
        onClick={handleClick}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          fontWeight: 'bold',
          background: isListening ? '#f00' : '#00f',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        {isListening ? 'STOP' : 'START VOICE'}
      </button>
      {message && (
        <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          {message}
        </div>
      )}
    </div>
  );
}