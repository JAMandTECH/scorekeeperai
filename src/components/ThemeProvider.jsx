import React, { useEffect } from "react";

export default function ThemeProvider({ organization, children }) {
  useEffect(() => {
    if (organization?.theme) {
      const { primary_color, secondary_color, accent_color } = organization.theme;
      
      // Apply CSS variables to root
      document.documentElement.style.setProperty('--org-primary', primary_color || '#3b82f6');
      document.documentElement.style.setProperty('--org-secondary', secondary_color || '#f97316');
      document.documentElement.style.setProperty('--org-accent', accent_color || '#8b5cf6');
      
      // Generate lighter/darker variants
      document.documentElement.style.setProperty('--org-primary-light', `${primary_color}20` || '#3b82f620');
      document.documentElement.style.setProperty('--org-secondary-light', `${secondary_color}20` || '#f9731620');
      document.documentElement.style.setProperty('--org-accent-light', `${accent_color}20` || '#8b5cf620');
    } else {
      // Default theme
      document.documentElement.style.setProperty('--org-primary', '#3b82f6');
      document.documentElement.style.setProperty('--org-secondary', '#f97316');
      document.documentElement.style.setProperty('--org-accent', '#8b5cf6');
      document.documentElement.style.setProperty('--org-primary-light', '#3b82f620');
      document.documentElement.style.setProperty('--org-secondary-light', '#f9731620');
      document.documentElement.style.setProperty('--org-accent-light', '#8b5cf620');
    }
  }, [organization?.theme]);

  return <>{children}</>;
}