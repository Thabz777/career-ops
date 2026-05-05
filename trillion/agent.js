import 'dotenv/config';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { datetimeTool } from './tools/datetime.js';
import { rememberTool, recallTool, setReminderTool } from './tools/memory.js';
import { webSearchTool } from './tools/webSearch.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── State ──────────────────────────────────────────────────────────────────

const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentTask: Annotation({
    reducer: (_, y) => y,
    default: () => null,
  }),
  toolResults: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// ── Tools registry ─────────────────────────────────────────────────────────

const ALL_TOOLS = [webSearchTool, datetimeTool, rememberTool, recallTool, setReminderTool];

const TOOLS_SCHEMA = ALL_TOOLS.map(t => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.schema),
  },
}));

const toolMap = Object.fromEntries(ALL_TOOLS.map(t => [t.name, t]));

// ── Nodes ──────────────────────────────────────────────────────────────────

async function callModel(state) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: state.messages,
    tools: TOOLS_SCHEMA,
    tool_choice: 'auto',
    max_tokens: 1024,
  });
  const msg = response.choices[0].message;
  return { messages: [msg] };
}

async function executeTools(state) {
  const lastMsg = state.messages.at(-1);
  const toolCalls = lastMsg.tool_calls ?? [];
  const results = [];

  for (const call of toolCalls) {
    const t = toolMap[call.function.name];
    if (!t) {
      results.push({
        role: 'tool',
        content: `Unknown tool: ${call.function.name}`,
        tool_call_id: call.id,
      });
      continue;
    }
    try {
      const args = JSON.parse(call.function.arguments);
      const output = await t.invoke(args);
      results.push({
        role: 'tool',
        content: String(output),
        tool_call_id: call.id,
      });
    } catch (err) {
      results.push({
        role: 'tool',
        content: `Tool error: ${err.message}`,
        tool_call_id: call.id,
      });
    }
  }

  return {
    messages: results,
    toolResults: results.map(r => r.content),
  };
}

async function respond(state) {
  return {};
}

// ── Routing ────────────────────────────────────────────────────────────────

function shouldUseTools(state) {
  const lastMsg = state.messages.at(-1);
  if (lastMsg?.tool_calls?.length > 0) return 'executeTools';
  return 'respond';
}

// ── Graph ──────────────────────────────────────────────────────────────────

const graph = new StateGraph(AgentState)
  .addNode('callModel', callModel)
  .addNode('executeTools', executeTools)
  .addNode('respond', respond)
  .addEdge(START, 'callModel')
  .addConditionalEdges('callModel', shouldUseTools, {
    executeTools: 'executeTools',
    respond: 'respond',
  })
  .addEdge('executeTools', 'callModel')
  .addEdge('respond', END);

export const compiledAgent = graph.compile();

// ── Public API ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Trillion, a voice-first AI personal assistant — sharp, concise, and intelligent.
Your responses will often be spoken aloud, so keep them natural and brief unless detail is clearly needed.
You can search the web, remember things, recall them, and set reminders.
Today is ${new Date().toDateString()}.`;

export async function runAgent(userMessage, history = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const finalState = await compiledAgent.invoke({ messages });
  const lastMsg = finalState.messages.at(-1);
  return lastMsg?.content ?? 'I had trouble generating a response. Please try again.';
}
