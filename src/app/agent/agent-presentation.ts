import { isStructuredAgentMode, type StructuredAgentMode } from './phase2-modes.ts';

const MAX_TITLE = 120;
const MAX_SUMMARY = 500;
const MAX_HEADING = 100;
const MAX_ITEM_TITLE = 180;
const MAX_ITEM_DETAIL = 360;
const MAX_BADGE = 60;
const MAX_TIME = 40;
const MAX_WARNING = 240;
const MAX_SECTIONS = 6;
const MAX_ITEMS = 8;
const MAX_WARNINGS = 5;

export interface AgentPresentationItem {
  title: string;
  detail?: string;
  time?: string;
  badge?: string;
}

export interface AgentPresentationSection {
  heading: string;
  items: AgentPresentationItem[];
}

export interface AgentPresentation {
  kind: StructuredAgentMode;
  title: string;
  summary?: string;
  sections: AgentPresentationSection[];
  warnings: string[];
}

function text(value: unknown, field: string, max: number, required = false): string | undefined {
  if (value == null || value === '') {
    if (required) throw new Error(`presentation ${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new Error(`presentation ${field} must be text`);
  const clean = value.trim();
  if (!clean && required) throw new Error(`presentation ${field} is required`);
  if (clean.length > max) throw new Error(`presentation ${field} is too long`);
  return clean || undefined;
}

export function parseAgentPresentation(input: unknown, expectedKind?: StructuredAgentMode): AgentPresentation | null {
  if (input == null) return null;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('presentation must be an object');
  const source = input as Record<string, unknown>;
  if (!isStructuredAgentMode(source.kind)) throw new Error('presentation kind is invalid');
  if (expectedKind && source.kind !== expectedKind) throw new Error('presentation kind does not match agent mode');

  const rawSections = source.sections == null ? [] : source.sections;
  if (!Array.isArray(rawSections)) throw new Error('presentation sections must be an array');
  if (rawSections.length > MAX_SECTIONS) throw new Error('presentation sections exceed limit');

  const sections = rawSections.map((raw, sectionIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`presentation sections[${sectionIndex}] is invalid`);
    const section = raw as Record<string, unknown>;
    const rawItems = section.items == null ? [] : section.items;
    if (!Array.isArray(rawItems)) throw new Error('presentation items must be an array');
    if (rawItems.length > MAX_ITEMS) throw new Error('presentation items exceed limit');
    return {
      heading: text(section.heading, 'heading', MAX_HEADING, true)!,
      items: rawItems.map((rawItem, itemIndex) => {
        if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) throw new Error(`presentation item ${itemIndex} is invalid`);
        const item = rawItem as Record<string, unknown>;
        const result: AgentPresentationItem = { title: text(item.title, 'item title', MAX_ITEM_TITLE, true)! };
        const detail = text(item.detail, 'item detail', MAX_ITEM_DETAIL);
        const time = text(item.time, 'item time', MAX_TIME);
        const badge = text(item.badge, 'item badge', MAX_BADGE);
        if (detail) result.detail = detail;
        if (time) result.time = time;
        if (badge) result.badge = badge;
        return result;
      }),
    };
  });

  const rawWarnings = source.warnings == null ? [] : source.warnings;
  if (!Array.isArray(rawWarnings)) throw new Error('presentation warnings must be an array');
  if (rawWarnings.length > MAX_WARNINGS) throw new Error('presentation warnings exceed limit');
  const warnings = rawWarnings.map((warning, index) => text(warning, `warning ${index}`, MAX_WARNING, true)!);

  const result: AgentPresentation = {
    kind: source.kind,
    title: text(source.title, 'title', MAX_TITLE, true)!,
    sections,
    warnings,
  };
  const summary = text(source.summary, 'summary', MAX_SUMMARY);
  if (summary) result.summary = summary;
  return result;
}
