import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Repeat } from "lucide-react";

export default function RecurringGameForm({ value, onChange }) {
  const [enabled, setEnabled] = useState(value?.enabled || false);
  const [frequency, setFrequency] = useState(value?.frequency || 'weekly');
  const [occurrences, setOccurrences] = useState(value?.occurrences || 10);
  const [interval, setInterval] = useState(value?.interval || 1);

  const handleChange = (updates) => {
    const newValue = {
      enabled,
      frequency,
      occurrences,
      interval,
      ...updates
    };
    setEnabled(newValue.enabled);
    setFrequency(newValue.frequency);
    setOccurrences(newValue.occurrences);
    setInterval(newValue.interval);
    onChange(newValue);
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-lg font-black text-gray-900 dark:text-white">Recurring Games</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring-enabled"
              checked={enabled}
              onCheckedChange={(checked) => handleChange({ enabled: checked })}
            />
            <label
              htmlFor="recurring-enabled"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enable
            </label>
          </div>
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-bold text-gray-700 dark:text-gray-300">Repeat Every</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="4"
                  value={interval}
                  onChange={(e) => handleChange({ interval: parseInt(e.target.value) })}
                  className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
                />
                <select
                  value={frequency}
                  onChange={(e) => handleChange({ frequency: e.target.value })}
                  className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                >
                  <option value="daily">Day(s)</option>
                  <option value="weekly">Week(s)</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label className="font-bold text-gray-700 dark:text-gray-300">Number of Games</Label>
              <Input
                type="number"
                min="2"
                max="52"
                value={occurrences}
                onChange={(e) => handleChange({ occurrences: parseInt(e.target.value) })}
                className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
              />
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
              <Calendar className="w-4 h-4 inline mr-1" />
              Will create {occurrences} games, one every {interval} {frequency === 'weekly' ? 'week' : 'day'}{interval > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}