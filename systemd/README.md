# TES Worker Telemetry API - Systemd Service Installation Guide

## Installation

### 1. Customize the service file

Edit `systemd/tes-worker-telemetry.service` and update:
- `WorkingDirectory`: Set to your actual APPENDIX directory path
- `User`: Set to the user that should run the service (or remove for current user)
- `ExecStart`: Verify Bun path is correct (`which bun`)

### 2. Install the service

```bash
# Copy service file to systemd directory
sudo cp systemd/tes-worker-telemetry.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable tes-worker-telemetry

# Start service
sudo systemctl start tes-worker-telemetry

# Check status
sudo systemctl status tes-worker-telemetry
```

### 3. Set environment variables

```bash
# Edit service to include TES_DEV_TOKEN
sudo systemctl edit tes-worker-telemetry.service

# Add to [Service] section:
[Service]
Environment="TES_DEV_TOKEN=your-secure-token-here"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart tes-worker-telemetry
```

### 4. Verify it's running

```bash
# Check logs
sudo journalctl -u tes-worker-telemetry -f

# Test endpoint
curl http://localhost:3000/api/workers/registry
```

## Service Management

```bash
# Start
sudo systemctl start tes-worker-telemetry

# Stop
sudo systemctl stop tes-worker-telemetry

# Restart
sudo systemctl restart tes-worker-telemetry

# Status
sudo systemctl status tes-worker-telemetry

# View logs
sudo journalctl -u tes-worker-telemetry -n 100

# Follow logs
sudo journalctl -u tes-worker-telemetry -f
```

## Troubleshooting

### Service won't start
1. Check logs: `sudo journalctl -u tes-worker-telemetry -n 50`
2. Verify Bun path: `which bun`
3. Verify working directory exists
4. Check permissions on APPENDIX directory

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Permission denied
```bash
# Check service user has access
sudo -u <service-user> ls /path/to/APPENDIX

# Fix permissions if needed
sudo chown -R <service-user>:<service-user> /path/to/APPENDIX
```

