import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2 } from "lucide-react";

/**
 * Admin-only toggle switches that persist standings exclusion preferences
 * on the Organization record. Only rendered for org admins / super admins.
 *
 * Props:
 *  - organization: the org record (must include id + standings_exclude_* flags)
 *  - onUpdated: callback fired after a successful toggle (parent refetches org)
 */
export default function StandingsControls({ organization, onUpdated }) {
  const [saving, setSaving] = useState(null); // 'draws' | 'defaults' | null

  if (!organization?.id) return null;

  const excludeDraws = !!organization.standings_exclude_draws;
  const excludeDefaults = !!organization.standings_exclude_defaults;

  const handleToggle = async (field, value) => {
    setSaving(field);
    try {
      await base44.entities.Organization.update(organization.id, { [field]: value });
      if (onUpdated) await onUpdated();
    } catch (e) {
      console.error("Failed to update standings setting:", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-muted/40 border border-border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-heading font-bold uppercase tracking-wide">Standings Options</span>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="exclude-draws"
          checked={excludeDraws}
          disabled={saving === "draws"}
          onCheckedChange={(v) => handleToggle("standings_exclude_draws", v)}
        />
        <Label htmlFor="exclude-draws" className="text-sm font-medium text-foreground cursor-pointer">
          Exclude Draws
          {saving === "draws" && <Loader2 className="w-3 h-3 ml-1 inline animate-spin" />}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="exclude-defaults"
          checked={excludeDefaults}
          disabled={saving === "defaults"}
          onCheckedChange={(v) => handleToggle("standings_exclude_defaults", v)}
        />
        <Label htmlFor="exclude-defaults" className="text-sm font-medium text-foreground cursor-pointer">
          Exclude Defaults
          {saving === "defaults" && <Loader2 className="w-3 h-3 ml-1 inline animate-spin" />}
        </Label>
      </div>
    </div>
  );
}