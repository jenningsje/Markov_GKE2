#!/bin/bash

cd /opt/app/MarkovProprietary/pipelinestages/app/mount

STATS_FILE="/opt/app/MarkovProprietary/pipelinestages/app/mount/output/stats.txt"
MESSAGE_FILE="/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt"
MOUNT="markovdocker5_markov_app"
DELAY_SECONDS=30

echo test

cleanup() {
    echo "Stopping Docker stats collector app at $(date)." >> "$STATS_FILE"
    echo "App stopped by the user." >&2
    exit 0
}

trap cleanup SIGINT

delete_content() {
    local output_file="$1"  # Take OUTPUT_FILE as the first parameter

    # Ensure the parameter is provided
    if [[ -z "$output_file" ]]; then
        echo "Usage: delete_stats <OUTPUT_FILE>"
        return 1
    fi

    # Delete the last stats from the old file before adding to it
    if [[ -f "$output_file" && $(wc -l < "$output_file") -gt 1 ]]; then
        sed -i '2,8d' "$output_file"
    fi

    # Add a space between previous output and new docker stats
    echo "" >> "$output_file"
}

write_content() {
    local container_ids="$1"  # Take CONTAINER_IDS as the first parameter
    local output_file="$2"    # Take OUTPUT_FILE as the second parameter

    docker stats --no-stream $container_ids >> "$output_file"
}

# Ensure necessary directories exist
mkdir -p "$(dirname "$STATS_FILE")"
touch "$STATS_FILE"

# retrieve the container ids
CONTAINER_IDS=$(docker ps -q --filter volume="$MOUNT")

echo "" >> "$STATS_FILE"
while true; do
    # delete content from stats.txt
    delete_content "$STATS_FILE"

    write_content "$CONTAINER_IDS" "$STATS_FILE"

    # delete pretty stats from message.txt
    delete_content "$MESSAGE_FILE"

    # write the pretty stats from stats.txt to message.txt
    python3.12 display_stats.py

    # Wait for the specified delay before the next iteration
    sleep "$DELAY_SECONDS"
done