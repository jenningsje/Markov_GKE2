from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})  # Nginx handles HTTPS/CORS headers

@app.route('/html', methods=['POST'])
def save_content():
    try:
        # Ensure the request is in JSON format
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        # Get JSON data from the request
        data = request.get_json()
        content = data.get('content')
        
        # Ensure 'content' is provided
        if not content:
            return jsonify({'error': 'Content not found in request'}), 400

        # Process the received content as needed (e.g., save to a file)
        print(f'Received content from frontend:\n{content}')
        
        # Ensure the output directory exists
        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)
        
        # Write the content to a file
        with open(os.path.join(output_dir, "from_front_end.txt"), "w") as f:
            f.write(content)
        
        # Return a success response
        return jsonify({'message': 'Content saved successfully'}), 200

    except Exception as e:
        print({'error': str(e)})
        return jsonify({'error': 'An error occurred while processing the content'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
