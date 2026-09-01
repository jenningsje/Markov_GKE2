from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import jwt
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Must match the JWT secret used in your Node.js server
JWT_SECRET = os.environ.get('JWT_SECRET')

# Shared Markov PVC mount
BASE_MOUNT = "/opt/app/MarkovProprietary/pipelinestages/app/mount"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check cookies first, then Authorization header (matching Express logic)
        if 'token' in request.cookies:
            token = request.cookies.get('token')
        elif 'Authorization' in request.headers:
            auth_header = request.headers.get('Authorization')
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 403

        if not token:
            return jsonify({'message': 'Authentication required'}), 401

        try:
            # Verify JWT using the same secret key as Express
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = decoded  # Attaches user payload {id, email, role} to request
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid or expired token'}), 403

        return f(*args, **kwargs)
    return decorated

@app.route('/html', methods=['POST'])
@token_required
def save_content():
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        content = data.get('content')
        
        if not content:
            return jsonify({'error': 'Content not found in request'}), 400

        # Extract user ID from the verified JWT token to isolate storage
        user_id = request.user.get('id', 'default')
        print(f'Received content from user {user_id}:\n{content}')
        
        # Write into this user's Markov PVC workspace
        user_output_dir = os.path.join(
            BASE_MOUNT,
            f"user-{user_id}",
            "output"
        )

        os.makedirs(user_output_dir, exist_ok=True)

        message_path = os.path.join(user_output_dir, "message.txt")

        if not os.path.exists(message_path):
            open(message_path, "w").close()
        
        # Write to the user's isolated file path
        file_path = os.path.join(user_output_dir, "from_front_end.txt")

        with open(file_path, "w") as f:
            f.write(content)
        
        return jsonify({
            'message': 'Content saved successfully',
            'user_id': user_id
        }), 200

    except Exception as e:
        print(f"ERROR saving content for user {request.user.get('id', 'unknown')}: {e}", flush=True)
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)