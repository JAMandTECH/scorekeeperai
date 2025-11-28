import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save, RotateCcw, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRESET_THEMES = [
  { name: "Blue & Orange", primary: "#3b82f6", secondary: "#f97316", accent: "#8b5cf6" },
  { name: "Green & Gold", primary: "#10b981", secondary: "#eab308", accent: "#06b6d4" },
  { name: "Red & Black", primary: "#ef4444", secondary: "#1f2937", accent: "#f59e0b" },
  { name: "Purple & Pink", primary: "#8b5cf6", secondary: "#ec4899", accent: "#06b6d4" },
  { name: "Teal & Coral", primary: "#14b8a6", secondary: "#f43f5e", accent: "#a855f7" },
  { name: "Navy & Gold", primary: "#1e3a5f", secondary: "#d4af37", accent: "#4a90a4" },
];

export default function ThemeCustomizer({ organization, onUpdate }) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState({
    primary_color: organization?.theme?.primary_color || "#3b82f6",
    secondary_color: organization?.theme?.secondary_color || "#f97316",
    accent_color: organization?.theme?.accent_color || "#8b5cf6",
  });
  const [saved, setSaved] = useState(false);

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme) => {
      await base44.entities.Organization.update(organization.id, {
        theme: newTheme
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['organization']);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onUpdate) onUpdate();
    }
  });

  const handleSave = () => {
    updateThemeMutation.mutate(theme);
  };

  const handleReset = () => {
    const defaultTheme = {
      primary_color: "#3b82f6",
      secondary_color: "#f97316",
      accent_color: "#8b5cf6",
    };
    setTheme(defaultTheme);
  };

  const applyPreset = (preset) => {
    setTheme({
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
    });
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          Theme Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Preset Themes */}
        <div>
          <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">
            Quick Presets
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all group"
              >
                <div className="flex gap-1 mb-2 justify-center">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md" 
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md" 
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md" 
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {preset.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
              Primary Color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={theme.primary_color}
                onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
              />
              <Input
                value={theme.primary_color}
                onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                className="flex-1 font-mono text-sm"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
              Secondary Color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={theme.secondary_color}
                onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
              />
              <Input
                value={theme.secondary_color}
                onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                className="flex-1 font-mono text-sm"
                placeholder="#f97316"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
              Accent Color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={theme.accent_color}
                onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
              />
              <Input
                value={theme.accent_color}
                onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                className="flex-1 font-mono text-sm"
                placeholder="#8b5cf6"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">
            Preview
          </Label>
          <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-wrap gap-3 mb-4">
              <Button 
                style={{ backgroundColor: theme.primary_color }}
                className="text-white font-bold"
              >
                Primary Button
              </Button>
              <Button 
                style={{ backgroundColor: theme.secondary_color }}
                className="text-white font-bold"
              >
                Secondary Button
              </Button>
              <Button 
                style={{ backgroundColor: theme.accent_color }}
                className="text-white font-bold"
              >
                Accent Button
              </Button>
            </div>
            <div className="flex gap-2">
              <Badge style={{ backgroundColor: `${theme.primary_color}20`, color: theme.primary_color, borderColor: theme.primary_color }} className="border font-bold">
                Primary Badge
              </Badge>
              <Badge style={{ backgroundColor: `${theme.secondary_color}20`, color: theme.secondary_color, borderColor: theme.secondary_color }} className="border font-bold">
                Secondary Badge
              </Badge>
              <Badge style={{ backgroundColor: `${theme.accent_color}20`, color: theme.accent_color, borderColor: theme.accent_color }} className="border font-bold">
                Accent Badge
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleReset}
            className="font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateThemeMutation.isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : updateThemeMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Theme
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}