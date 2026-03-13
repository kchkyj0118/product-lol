#!/bin/bash

# Check if a commit message was provided
if [ -z "$1" ]
then
  MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
else
  MESSAGE="$1"
fi

# Add all changes
git add .

# Commit with the message
git commit -m "$MESSAGE"

# Push to the main branch
git push origin main

echo "------------------------------------------"
echo "✅ 코드가 깃허브에 성공적으로 올라갔습니다!"
echo "Cloudflare Pages에서 자동으로 배포가 시작됩니다."
echo "------------------------------------------"
