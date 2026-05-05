import { tool } from '@langchain/core/tools';
import { EventEmitter } from 'events';
import { z } from 'zod';

const store = new Map();
export const reminderEmitter = new EventEmitter();

export const rememberTool = tool(
  ({ key, value }) => {
    store.set(key, { value, savedAt: new Date().toISOString() });
    return `Remembered "${key}".`;
  },
  {
    name: 'remember',
    description: 'Persist a key-value pair in memory for later recall.',
    schema: z.object({
      key: z.string().describe('Unique label for the memory'),
      value: z.string().describe('Content to store'),
    }),
  }
);

export const recallTool = tool(
  ({ key }) => {
    const entry = store.get(key);
    if (!entry) return `No memory found for key "${key}".`;
    return JSON.stringify(entry);
  },
  {
    name: 'recall',
    description: 'Retrieve a previously stored memory by key.',
    schema: z.object({ key: z.string().describe('Memory key to retrieve') }),
  }
);

export const setReminderTool = tool(
  ({ text, delaySeconds }) => {
    const id = Date.now().toString(36);
    const fireAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    setTimeout(() => {
      reminderEmitter.emit('fire', { id, text });
    }, delaySeconds * 1000);
    return `Reminder set: "${text}" fires in ${delaySeconds}s (at ${fireAt}).`;
  },
  {
    name: 'set_reminder',
    description: 'Schedule a reminder to fire after N seconds.',
    schema: z.object({
      text: z.string().describe('Reminder message'),
      delaySeconds: z.number().int().positive().describe('Seconds until reminder fires'),
    }),
  }
);
