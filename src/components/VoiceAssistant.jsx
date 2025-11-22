import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VoiceAssistant({ 
  homePlayers = [], 
  awayPlayers = [], 
  onCommand,
  sport = "basketball" // "basketball" or "volleyball"
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("neutral");
  const recognitionRef = useRef(null);

  const showFeedback = (message, type) => {
    setFeedback(message);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedback("");
      setFeedbackType("neutral");
    }, 3000);
  };

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase().trim();
    
    const isHome = lowerCommand.includes('home');
    const isAway = lowerCommand.includes('away');
    
    if (!isHome && !isAway) {
      showFeedback("Please specify 'home' or 'away'", "error");
      return;
    }

    const team = isHome ? 'home' : 'away';
    const players = isHome ? homePlayers : awayPlayers;

    if (!players || players.length === 0) {
      showFeedback(`No players found for ${team} team`, "error");
      return;
    }

    const numberMatch = lowerCommand.match(/(?:number\s+)?(\d{1,3})/);
    if (!numberMatch) {
      showFeedback("Player number not found", "error");
      return;
    }

    const jerseyNumber = numberMatch[1];
    const player = players.find(p => 
      String(p.jersey_number).trim() === String(jerseyNumber).trim() ||
      parseInt(p.jersey_number) === parseInt(jerseyNumber)
    );
    
    if (!player) {
      showFeedback(`Player #${jerseyNumber} not found in ${team} team`, "error");
      return;
    }

    // Parse action based on sport
    let action = null;
    let value = 1;

    if (sport === "basketball") {
      // Basketball actions
      if (lowerCommand.includes('3 point') || lowerCommand.includes('three point') || lowerCommand.includes('3-point')) {
        action = '3-pointer';
        value = 3;
      } else if (lowerCommand.includes('2 point') || lowerCommand.includes('two point') || lowerCommand.includes('2-point')) {
        action = '2-pointer';
        value = 2;
      } else if (lowerCommand.includes('free throw') || lowerCommand.includes('foul shot')) {
        action = 'free-throw';
        value = 1;
      } else if (lowerCommand.includes('foul')) {
        action = 'foul';
      } else if (lowerCommand.includes('rebound')) {
        action = 'rebound';
      } else if (lowerCommand.includes('assist')) {
        action = 'assist';
      } else if (lowerCommand.includes('steal')) {
        action = 'steal';
      } else if (lowerCommand.includes('block')) {
        action = 'block';
      }
    } else if (sport === "volleyball") {
      // Volleyball actions
      if (lowerCommand.includes('point') || lowerCommand.includes('score')) {
        action = 'point';
      } else if (lowerCommand.includes('kill') || lowerCommand.includes('spike')) {
        action = 'kill';
      } else if (lowerCommand.includes('ace') || lowerCommand.includes('service ace')) {
        action = 'ace';
      } else if (lowerCommand.includes('block')) {
        action = 'block';
      } else if (lowerCommand.includes('assist') || lowerCommand.includes('set')) {
        action = 'assist';
      } else if (lowerCommand.includes('dig')) {
        action = 'dig';
      } else if (lowerCommand.includes('error')) {
        action = 'error';
      }
    }

    if (!action) {
      showFeedback("Action not recognized. Try: points, foul, rebound, assist, steal, block" + 
        (sport === "volleyball" ? ", kill, ace, dig, error" : ""), "error");
      return;
    }

    // Execute the command
    onCommand({
      team,
      player,
      action,
      value
    });

    showFeedback(`✓ ${player.first_name} ${player.last_name} - ${action}`, "success");
  };

  const toggleListening = () => {
    console.log("Voice Assistant button clicked, isListening:", isListening);
    
    if (isListening) {
      console.log("Stopping voice assistant");
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setTranscript("");
      setFeedback("Voice assistant stopped");
      setFeedbackType("neutral");
      return;
    }

    console.log("Starting voice assistant");
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Speech recognition not supported");
      showFeedback("Voice recognition not supported in this browser", "error");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log("Voice command received:", finalTranscript);
        setTranscript(finalTranscript);
        processCommand(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      showFeedback(`Microphone error: ${event.error}. Check permissions.`, "error");
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("Recognition ended, isListening:", isListening);
      if (isListening) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsListening(false);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      showFeedback("🎤 Listening... Say 'home 17 2 points'", "listening");
      console.log("Voice assistant started successfully");
    } catch (error) {
      console.error('Error starting recognition:', error);
      showFeedback("Failed to start. Check microphone permissions.", "error");
    }
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={toggleListening}
            className={`${
              isListening 
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
            } text-white font-bold shadow-lg`}
            size="lg"
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Voice Assistant
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Assistant
              </>
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            {transcript && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 italic truncate">
                "{transcript}"
              </div>
            )}
            {feedback && (
              <Badge 
                className={`font-bold ${
                  feedbackType === "success" 
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                    : feedbackType === "error"
                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                    : feedbackType === "listening"
                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800'
                }`}
              >
                {feedbackType === "listening" && <Volume2 className="w-3 h-3 mr-1 inline animate-pulse" />}
                {feedback}
              </Badge>
            )}
          </div>
        </div>
        
        {isListening && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-2">Voice Commands:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-purple-700 dark:text-purple-400">
              {sport === "basketball" ? (
                <>
                  <div>"home 17 2 points"</div>
                  <div>"away 23 3 points"</div>
                  <div>"home 5 free throw"</div>
                  <div>"away 12 foul"</div>
                  <div>"home 8 rebound"</div>
                  <div>"away 11 assist"</div>
                  <div>"home 3 steal"</div>
                  <div>"away 9 block"</div>
                </>
              ) : (
                <>
                  <div>"home 17 point"</div>
                  <div>"away 23 kill"</div>
                  <div>"home 5 ace"</div>
                  <div>"away 12 block"</div>
                  <div>"home 8 assist"</div>
                  <div>"away 11 dig"</div>
                  <div>"home 3 error"</div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}