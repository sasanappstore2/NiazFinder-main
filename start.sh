#!/bin/bash
cd /home/z/my-project
rm -rf .next
exec node_modules/.bin/next dev -p 3000

