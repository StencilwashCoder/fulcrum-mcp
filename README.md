# fulcrum-mcp

MCP server for [Fulcrum](https://fulcrum.lab.ericgrill.com) — provides tools to manage jobs, workers, and knowledge from any MCP-compatible client.

## Tools

| Tool | Description |
|------|-------------|
| `submit_job` | Submit a new job to Fulcrum's job queue |
| `list_jobs` | List jobs, optionally filtered by status |
| `get_job` | Get detailed info about a specific job |
| `job_status` | Get current status and progress of a job |
| `stop_job` | Stop a running job |
| `list_workers` | List all worker nodes and their status |
| `brainstorm_job` | Trigger AI brainstorming for a job |
| `search_knowledge` | Semantic search across the knowledge base |

## Usage

### With Claude Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "fulcrum": {
      "command": "node",
      "args": ["/path/to/fulcrum-mcp/index.js"],
      "env": {
        "FULCRUM_URL": "http://192.168.50.100:3090"
      }
    }
  }
}
```

### Standalone

```bash
FULCRUM_URL=http://192.168.50.100:3090 node index.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FULCRUM_URL` | `http://192.168.50.100:3090` | Fulcrum API base URL |

## License

MIT
