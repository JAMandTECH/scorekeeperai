import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileImage, FileText, FileSpreadsheet, Sparkles, X, CheckCircle, AlertCircle } from "lucide-react";

export default function PlayerFileScanner({ onPlayersExtracted, sport = "basketball" }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const playerSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Full player name as written (any format, e.g., Michael Jordan, Jordan Michael, Jordan, M.)"
        },
        first_name: {
          type: "string",
          description: "Player's first name (if available)"
        },
        last_name: {
          type: "string",
          description: "Player's last name (if available)"
        },
        jersey_number: {
          type: "string",
          description: "Jersey number in any format (e.g., 23, #23, No 23, (23))"
        },
        position: {
          type: "string",
          description: sport === "basketball" 
            ? "Position (e.g., PG, SG, SF, PF, C, Guard, Forward, Center)" 
            : "Position (e.g., Setter, Libero, Outside Hitter, Middle Blocker, Opposite)"
        },
        contact_number: {
          type: "string",
          description: "Player's contact phone number (if available)"
        }
      },
      anyOf: [
        { required: ["name"] },
        { required: ["first_name", "last_name"] }
      ]
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = "";
  };

  const processFile = async (file) => {
    setError(null);
    setSuccess(null);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/json'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.csv', '.xlsx', '.txt', '.json'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    
    if (!isValidType) {
      setError("Please upload an image (PNG, JPG), PDF, or CSV file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return;
    }

    try {
      // Step 1: Upload file
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setIsUploading(false);

      // Step 2: Extract data using AI
      setIsExtracting(true);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            players: playerSchema
          },
          required: ["players"]
        }
      });

      setIsExtracting(false);

      if (result.status === "error") {
        setError(result.details || "Failed to extract player data from the file.");
        return;
      }

      const extractedPlayers = result.output?.players || [];
      
      if (extractedPlayers.length === 0) {
        setError("No player data could be extracted from this file. Please ensure the file contains player information.");
        return;
      }

      // Format players for the form
      const formattedPlayers = extractedPlayers.map((p) => {
        const fullName = (p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '').trim();
        let jersey = String(p.jersey_number || '').trim();
        if (!jersey) {
          const nums = (fullName.match(/\d{1,3}/g) || []);
          if (nums.length) jersey = nums[nums.length - 1];
        }
        jersey = jersey.replace(/[^\d]/g, '');

        let nameOnly = fullName
          .replace(/\bNo\.?\s*\d+\b/ig, '')
          .replace(/[#\(\)\-]*\b\d{1,3}\b[#\)\-]*/g, '')
          .replace(/^\s*\d+\s*[.)-]?\s*/, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
          .replace(/^[,\.\-]+|[,\.\-]+$/g, '');

        if (!nameOnly && (p.first_name || p.last_name)) {
          nameOnly = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
        }

        const [first, ...rest] = nameOnly.split(/\s+/);
        const last = rest.join(' ');

        return {
          jersey_number: jersey,
          first_name: p.first_name || first || '',
          last_name: p.last_name || last || '',
          position: p.position || '',
          contact_number: p.contact_number || '',
          photo_url: ''
        };
      });

      setSuccess(`Successfully extracted ${formattedPlayers.length} player(s) from the file!`);
      onPlayersExtracted(formattedPlayers);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error("Error processing file:", err);
      setError("An error occurred while processing the file. Please try again.");
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  const isProcessing = isUploading || isExtracting;

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30 border-2 border-purple-200 dark:border-purple-800 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          AI Player Scanner
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload an image, PDF, or CSV with player information and AI will automatically fill the form
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300 font-medium flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)} className="ml-2">
                <X className="w-4 h-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300 font-bold">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
            dragActive 
              ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30" 
              : "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600"
          } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.csv,.xlsx,.txt,.json,image/png,image/jpeg,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/json"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {isProcessing ? (
            <div className="py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-purple-700 dark:text-purple-300 font-bold">
                {isUploading ? "Uploading file..." : "AI is extracting player data..."}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This may take a few seconds
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                  <FileImage className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-bold mb-1">
                Drop file here or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports: Images (PNG, JPG), PDF, CSV
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Max file size: 10MB
              </p>
            </>
          )}
        </div>

        <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            <strong>💡 Tip:</strong> Any clear list or table works. Examples: "23 Michael Jordan", "Michael Jordan #23", "No. 23 Michael Jordan", "(23) Jordan, Michael".
          </p>
        </div>
      </CardContent>
    </Card>
  );
}