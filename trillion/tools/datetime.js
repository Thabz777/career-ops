import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const datetimeTool = tool(
  () => {
    const now = new Date();
    return JSON.stringify({
      iso: now.toISOString(),
      utc: now.toUTCString(),
      local: now.toLocaleString('en-US', { timeZoneName: 'short' }),
      timestamp: now.getTime(),
    });
  },
  {
    name: 'get_datetime',
    description: 'Returns the current date, time, timezone, and UTC offset.',
    schema: z.object({}),
  }
);
