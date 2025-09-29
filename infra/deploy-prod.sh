#!/bin/bash

# Exit on error
set -e

# Configuration
export PROJECT_ID="przemeksroka-joonix-service"
export SERVICE_NAME="network-topology"
export REGION="us-central1" # Or your preferred region
export REPO_NAME="network-topology-repo"
export IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

# Build the frontend
echo "Building the frontend..."
npm run frontend:build
echo "Frontend build complete."

# Build the container image using Cloud Build
gcloud builds submit --tag $IMAGE_NAME --project $PROJECT_ID

# Deploy the container image to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated
