/**
 * ==============================================================================
 * FILE: dossierIcons.ts
 * Path: src/app/client/profile/dossierIcons.ts
 * Description: Centralized icon map for Dossier Document Checklist items.
 *              Each document name is mapped to its corresponding Lucide icon.
 *              Import this file wherever dossier document icons are needed.
 * ==============================================================================
 */

import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  DollarSign,
  Landmark,
  FileSpreadsheet,
  Briefcase,
  Building2,
  Home,
  FolderOpen,
} from "lucide-react";

export const dossierDocIcons: Record<string, LucideIcon> = {
  "Government ID":        CreditCard,
  "Proof of Income":      DollarSign,
  "Bank Statement":       Landmark,
  "Tax Documents":        FileSpreadsheet,
  "Employment Documents": Briefcase,
  "Business Documents":   Building2,
  "Collateral Documents": Home,
  "Other Documents":      FolderOpen,
};
