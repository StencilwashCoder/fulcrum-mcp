#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const FULCRUM_URL = process.env.FULCRUM_URL || "http://192.168.50.100:3090";

// Helper to call Fulcrum API
async function fulcrumApi(method, path, body = null) {
  const url = `${FULCRUM_URL}${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fulcrum API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fulcrumPost(path, body) {
  const url = `${FULCRUM_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Fulcrum API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Create MCP server
const server = new Server(
  { name: "fulcrum-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "submit_job",
      description: "Submit a new job to Fulcrum's job queue for AI execution",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title for the job",
          },
          content: {
            type: "string",
            description: "Detailed description of what the job should accomplish",
          },
        },
        required: ["title", "content"],
      },
    },
    {
      name: "list_jobs",
      description: "List jobs in the queue, optionally filtered by status",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["incoming", "intake", "executing", "waiting", "completed", "failed", "stopped"],
            description: "Filter by job status",
          },
          limit: {
            type: "number",
            description: "Maximum number of jobs to return (default 20)",
          },
        },
      },
    },
    {
      name: "get_job",
      description: "Get detailed information about a specific job",
      inputSchema: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The job ID (e.g., 'job-123' or just '123')",
          },
        },
        required: ["job_id"],
      },
    },
    {
      name: "job_status",
      description: "Get the current status and progress of a job",
      inputSchema: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The job ID",
          },
        },
        required: ["job_id"],
      },
    },
    {
      name: "stop_job",
      description: "Stop a running job",
      inputSchema: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The job ID to stop",
          },
        },
        required: ["job_id"],
      },
    },
    {
      name: "list_workers",
      description: "List all worker nodes and their status",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "brainstorm_job",
      description: "Trigger AI brainstorming for a job to get insights and suggestions",
      inputSchema: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The job ID to brainstorm",
          },
        },
        required: ["job_id"],
      },
    },
    {
      name: "search_knowledge",
      description: "Semantic search across the knowledge base",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          top_k: {
            type: "number",
            description: "Number of results (default 5)",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "submit_job": {
        const result = await fulcrumPost("/api/jobs", {
          title: args.title,
          content: args.content,
          source: "human",
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_jobs": {
        const url = args.status
          ? `/api/jobs?status=${args.status}`
          : "/api/jobs";
        const result = await fulcrumApi("GET", url);
        const jobs = result.jobs || [];
        const limited = jobs.slice(0, args.limit || 20);
        const summary = limited.map((j) => ({
          job_id: j.job_id,
          title: j.title,
          status: j.status,
          task_type: j.task_type,
          assigned_node: j.assigned_node,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ jobs: summary, total: result.total }, null, 2),
            },
          ],
        };
      }

      case "get_job": {
        const jobId = args.job_id.replace(/^job-/, "");
        const result = await fulcrumApi("GET", `/api/jobs/${jobId}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "job_status": {
        const jobId = args.job_id.replace(/^job-/, "");
        const result = await fulcrumApi("GET", `/api/jobs/${jobId}/status`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "stop_job": {
        const jobId = args.job_id.replace(/^job-/, "");
        const result = await fulcrumPost(`/api/jobs/${jobId}/stop`, {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_workers": {
        const result = await fulcrumApi("GET", "/api/nodes");
        const nodes = result.nodes || [];
        const summary = nodes.map((n) => ({
          name: n.name,
          status: n.status,
          capabilities: n.capabilities,
          running_tasks: n.runningTasks?.length || 0,
          task_stats: n.taskStats,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ workers: summary, total: result.total }, null, 2),
            },
          ],
        };
      }

      case "brainstorm_job": {
        const jobId = args.job_id.replace(/^job-/, "");
        const result = await fulcrumPost(`/api/jobs/${jobId}/brainstorm`, {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search_knowledge": {
        const result = await fulcrumPost("/api/knowledge/query", {
          query: args.query,
          top_k: args.top_k || 5,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Fulcrum MCP server running on stdio");
}

main().catch(console.error);
