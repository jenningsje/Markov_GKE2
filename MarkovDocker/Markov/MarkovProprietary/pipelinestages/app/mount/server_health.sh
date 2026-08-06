cd ../MarkovProprietary/pipelinestages/app/mount

STATS_FILE="/opt/app/MarkovProprietary/pipelinestages/app/mount/output/stats.txt"
MESSAGE_FILE="/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt"
MOUNT_PATH="/opt/app/MarkovProprietary/pipelinestages/app/mount"
DELAY_SECONDS=30

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
    local mount_path="$3"     # Optionally take MOUNT_PATH as the third parameter

    # Ensure CONTAINER_IDS and OUTPUT_FILE are provided
    if [[ -z "$container_ids" || -z "$output_file" ]]; then
        echo "Usage: write_stats <CONTAINER_IDS> <OUTPUT_FILE> [MOUNT_PATH]"
        return 1
    fi

    if [[ -n "$container_ids" ]]; then
        # Append the new docker stats output
        docker stats --no-stream $container_ids >> "$output_file"
    else
        echo "No containers with mount $mount_path found." >> "$output_file"
    fi
}

# Ensure necessary directories exist
mkdir -p "$(dirname "$STATS_FILE")"
touch "$STATS_FILE"

# retrieve the container ids
CONTAINER_IDS=$(docker ps -q --filter volume="$MOUNT_PATH")

echo "" >> "$STATS_FILE"
while true; do
    # delete content from stats.txt
    delete_content "$STATS_FILE"

    write_content "$CONTAINER_IDS" "$STATS_FILE" "$MOUNT_PATH"

    # delete pretty stats from message.txt
    delete_content "$MESSAGE_FILE"

    # write the pretty stats from stats.txt to message.txt
    python display_stats.py

    # Wait for the specified delay before the next iteration
    sleep "$DELAY_SECONDS"
done