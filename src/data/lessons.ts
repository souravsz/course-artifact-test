import type { Lesson } from '../types';

/**
 * Lesson registry. Adding a lesson = adding one entry here (later: loaded from an API).
 * The HTML file is served from /public and loaded by URL inside a sandboxed iframe.
 */
export const lessons: Lesson[] = [
  {
    id: 'wm-101',
    title: 'Waste Segregation at Source',
    description: 'Steward onboarding · Module 01',
    fileUrl: '/lessons/waste-segregation-steward.html',
    estMinutes: 10,
    category: 'Steward Onboarding',
  },
  {
    id: 'cc-102',
    title: 'Community Conversations',
    description: 'Steward onboarding · Module 02',
    estMinutes: 12,
    category: 'Steward Onboarding',
  },
  {
    id: 'cp-201',
    title: 'Composting Basics',
    description: 'Field skills · Module 01',
    estMinutes: 15,
    category: 'Field Skills',
  },
];

export function findLesson(id: string | null | undefined): Lesson | undefined {
  return id ? lessons.find((l) => l.id === id) : undefined;
}
