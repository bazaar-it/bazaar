#!/bin/bash
# src/scripts/run-component-fix.sh

# Export environment variables
export DATABASE_URL='postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require'
export DATABASE_URL_NON_POOLED='postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require'
export R2_ENDPOINT='https://3a37cf04c89e7483b59120fb95af6468.r2.cloudflarestorage.com'
export R2_ACCESS_KEY_ID='ec29e309df0ec86c81010249652f7adc'
export R2_SECRET_ACCESS_KEY='c644c672817d0d28625ee400c0504489932fe6d6b837098a296096da1c8d04e3'
export R2_BUCKET_NAME='bazaar-vid-components'
export R2_PUBLIC_URL='https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev'

# Run the component fix script
echo "Compiling TypeScript..."
npx tsc -p tsconfig.node.json src/scripts/fix-components-db.ts

echo "Running component fix script..."
node dist/src/scripts/fix-components-db.js

echo "Done!" 