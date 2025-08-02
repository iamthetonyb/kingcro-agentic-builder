#!/bin/bash

# KingCRO Agentic Builder Setup Script
# This script sets up the complete voice-to-book platform

set -e

echo "🎙️ KingCRO Agentic Builder Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    
    echo -e "${YELLOW}Please edit the .env file with your configuration:${NC}"
    echo "- Set strong passwords for POSTGRES_PASSWORD and JWT_SECRET"
    echo "- Configure your VLLM_API_KEY"
    echo "- Set other environment variables as needed"
    
    read -p "Press Enter to continue after editing .env file..."
fi

# Create necessary directories
echo -e "${GREEN}Creating directories...${NC}"
mkdir -p uploads
mkdir -p logs

# Build and start services (lightweight Codespace version)
echo -e "${GREEN}Starting PostgreSQL database only...${NC}"
docker-compose -f docker-compose.codespace.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for database to start...${NC}"
sleep 10

# Check service health
echo -e "${GREEN}Checking service health...${NC}"

# Check PostgreSQL
if docker-compose -f docker-compose.codespace.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Codespace setup complete!${NC}"
echo ""
echo "Services running in Codespace:"
echo "- PostgreSQL: localhost:5432"
echo ""
echo "To run AI services on your Mac:"
echo "1. Download and run: curl -o setup-mac-local.sh https://raw.githubusercontent.com/your-repo/setup-mac-local.sh"
echo "2. chmod +x setup-mac-local.sh && ./setup-mac-local.sh"
echo "3. Start the services as instructed"
echo ""
echo "Then start the API server:"
echo "cd agentic_copywriter/api && node server.js"
