#!/bin/bash
cd /home/kavia/workspace/code-generation/manufacturing-line-performance-monitor-3358-3367/frontend_react_tailwind
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

