#!/bin/bash

# Function to check if there are changes to commit
check_changes() {
    if [[ -z $(git status -s) ]]; then
        echo "No changes to commit."
        exit 0
    fi
}

# Function to handle errors
handle_error() {
    echo "Error: $1"
    exit 1
}

# Check for changes
check_changes

# Stage and commit docs for both repos
echo "Staging changes in 'docs'..."
git add docs || handle_error "Failed to stage docs"

echo "Committing changes in 'docs'..."
git commit -m "Update docs" || handle_error "Failed to commit docs"

echo "Pushing 'docs' to public repo..."
git push origin main || handle_error "Failed to push to public repo"

# Stage and commit all changes (including source) for private repo
echo "Staging all changes for private repo..."
git add . || handle_error "Failed to stage all changes"

echo "Committing all changes for private repo..."
git commit -m "Update all files" || handle_error "Failed to commit all changes"

echo "Pushing all changes to private repo..."
git push private main || handle_error "Failed to push to private repo"

echo "All operations completed successfully."