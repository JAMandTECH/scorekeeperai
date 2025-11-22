import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('voiceAssistantLanguage') || 'en-US';
  });
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setFeedback("Voice recognition not supported in this browser");
      setFeedbackType("error");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = selectedLanguage;

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      
      // Check if "DONE" command is detected
      if (currentTranscript.toLowerCase().includes('done')) {
        // Extract command before "DONE"
        const commandText = currentTranscript.toLowerCase().split('done')[0].trim();
        if (commandText) {
          setTranscript(commandText);
          processCommand(commandText);
          // Stop listening after processing
          recognitionRef.current?.stop();
          setIsListening(false);
        }
        return;
      }

      // Only show transcript but don't execute until "DONE" is said
      if (finalTranscript) {
        setTranscript(finalTranscript);
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setFeedback(`Error: ${event.error}`);
      setFeedbackType("error");
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        recognitionRef.current.start();
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage]);

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Parse team (home/away)
    const isHome = lowerCommand.includes('home');
    const isAway = lowerCommand.includes('away');
    
    if (!isHome && !isAway) {
      showFeedback("Please specify 'home' or 'away'", "error");
      return;
    }

    const team = isHome ? 'home' : 'away';
    const players = isHome ? homePlayers : awayPlayers;

    // Extract jersey number
    const numberMatch = lowerCommand.match(/\b(\d{1,2})\b/);
    if (!numberMatch) {
      showFeedback("Player number not found", "error");
      return;
    }

    const jerseyNumber = numberMatch[1];
    const player = players.find(p => p.jersey_number === jerseyNumber);
    
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

  const showFeedback = (message, type) => {
    setFeedback(message);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedback("");
      setFeedbackType("neutral");
    }, 3000);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    localStorage.setItem('voiceAssistantLanguage', lang);
    
    // If currently listening, restart recognition with new language
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
          setIsListening(true);
          setFeedback(`Language changed to ${lang}. Listening...`);
          setFeedbackType("listening");
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setFeedback("Failed to restart voice recognition");
          setFeedbackType("error");
        }
      }, 300);
    } else {
      showFeedback(`Language set to ${lang}`, "success");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript("");
      setFeedback("Voice assistant stopped");
      setFeedbackType("neutral");
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setFeedback("Listening... Say commands like 'home 17 2 points'");
        setFeedbackType("listening");
      } catch (error) {
        console.error('Error starting recognition:', error);
        setFeedback("Failed to start voice recognition");
        setFeedbackType("error");
      }
    }
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-800">
      <CardContent className="p-4 space-y-4">
        {/* Language Selection */}
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <Label className="font-bold text-gray-700 dark:text-gray-300 text-sm">Language/Accent:</Label>
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-64 bg-white dark:bg-gray-900 border-2 border-purple-300 dark:border-purple-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English (United States)</SelectItem>
              <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
              <SelectItem value="en-AU">English (Australia)</SelectItem>
              <SelectItem value="en-PH">English (Philippines)</SelectItem>
              <SelectItem value="en-IN">English (India)</SelectItem>
              <SelectItem value="fil-PH">Filipino (Tagalog)</SelectItem>
              <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
              <SelectItem value="es-MX">Spanish (Mexico)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            <div className="mb-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded">
              <p className="text-xs font-bold text-green-800 dark:text-green-300">Say "DONE" to execute command immediately</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-purple-700 dark:text-purple-400">
              {sport === "basketball" ? (
                <>
                  <div>"home 17 2 points DONE"</div>
                  <div>"away 23 3 points DONE"</div>
                  <div>"home 5 free throw DONE"</div>
                  <div>"away 12 foul DONE"</div>
                  <div>"home 8 rebound DONE"</div>
                  <div>"away 11 assist DONE"</div>
                  <div>"home 3 steal DONE"</div>
                  <div>"away 9 block DONE"</div>
                </>
              ) : (
                <>
                  <div>"home 17 point DONE"</div>
                  <div>"away 23 kill DONE"</div>
                  <div>"home 5 ace DONE"</div>
                  <div>"away 12 block DONE"</div>
                  <div>"home 8 assist DONE"</div>
                  <div>"away 11 dig DONE"</div>
                  <div>"home 3 error DONE"</div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}