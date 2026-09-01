from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import jwt
import os
import shutil

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

JWT_SECRET = os.environ.get('JWT_SECRET')

BASE_MOUNT = "/opt/app/MarkovProprietary/pipelinestages/app/mount"

TEMPLATE_INPUT_DIR = os.path.join(
    BASE_MOUNT,
    "input"
)

TEMPLATE_OUTPUT_DIR = os.path.join(
    BASE_MOUNT,
    "output"
)


# =====================
# AUTHENTICATION
# =====================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        token = None

        if 'token' in request.cookies:
            token = request.cookies.get('token')

        elif 'Authorization' in request.headers:

            auth_header = request.headers.get(
                'Authorization'
            )

            try:
                token = auth_header.split(" ")[1]

            except (IndexError, AttributeError):
                return jsonify({
                    'message': 'Invalid token format'
                }), 403

        if not token:
            return jsonify({
                'message': 'Authentication required'
            }), 401

        try:

            decoded = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"]
            )

            request.user = decoded

        except jwt.ExpiredSignatureError:

            return jsonify({
                'message': 'Token has expired'
            }), 403

        except jwt.InvalidTokenError:

            return jsonify({
                'message': 'Invalid or expired token'
            }), 403

        return f(*args, **kwargs)

    return decorated


# =====================
# USER PATH HELPERS
# =====================

def get_user_root(user_id):

    return os.path.join(
        BASE_MOUNT,
        f"user-{user_id}"
    )


def get_user_input_dir(user_id):

    return os.path.join(
        get_user_root(user_id),
        "input"
    )


def get_user_output_dir(user_id):

    return os.path.join(
        get_user_root(user_id),
        "output"
    )


# =====================
# USER WORKSPACE SETUP
# =====================

def ensure_user_workspace(user_id):

    user_root = get_user_root(user_id)

    user_input_dir = get_user_input_dir(user_id)

    user_output_dir = get_user_output_dir(user_id)

    # Always make sure the directories exist.
    os.makedirs(
        user_input_dir,
        exist_ok=True
    )

    os.makedirs(
        user_output_dir,
        exist_ok=True
    )

    print(
        f"Ensuring workspace for user {user_id}",
        flush=True
    )

    # -------------------------------------------------
    # Copy EVERYTHING from template input -> user input
    # -------------------------------------------------

    if os.path.isdir(TEMPLATE_INPUT_DIR):

        for item in os.listdir(TEMPLATE_INPUT_DIR):

            source = os.path.join(
                TEMPLATE_INPUT_DIR,
                item
            )

            destination = os.path.join(
                user_input_dir,
                item
            )

            # Do not overwrite files that already belong
            # to the user's workspace.
            if os.path.exists(destination):
                continue

            if os.path.isdir(source):

                shutil.copytree(
                    source,
                    destination
                )

            else:

                shutil.copy2(
                    source,
                    destination
                )

            print(
                f"Copied input template item: {item}",
                flush=True
            )

    else:

        print(
            f"WARNING: Template input directory does not exist: "
            f"{TEMPLATE_INPUT_DIR}",
            flush=True
        )

    # --------------------------------------------------
    # Copy EVERYTHING from template output -> user output
    # --------------------------------------------------

    if os.path.isdir(TEMPLATE_OUTPUT_DIR):

        for item in os.listdir(TEMPLATE_OUTPUT_DIR):

            source = os.path.join(
                TEMPLATE_OUTPUT_DIR,
                item
            )

            destination = os.path.join(
                user_output_dir,
                item
            )

            # Do not overwrite files that already belong
            # to the user's workspace.
            if os.path.exists(destination):
                continue

            if os.path.isdir(source):

                shutil.copytree(
                    source,
                    destination
                )

            else:

                shutil.copy2(
                    source,
                    destination
                )

            print(
                f"Copied output template item: {item}",
                flush=True
            )

    else:

        print(
            f"WARNING: Template output directory does not exist: "
            f"{TEMPLATE_OUTPUT_DIR}",
            flush=True
        )

    print(
        f"Workspace ready for user {user_id}",
        flush=True
    )

    return {
        'root': user_root,
        'input': user_input_dir,
        'output': user_output_dir
    }


# =====================
# MESSAGE FILE
# =====================

def ensure_user_message_file(user_id):

    user_output_dir = get_user_output_dir(user_id)

    os.makedirs(
        user_output_dir,
        exist_ok=True
    )

    message_path = os.path.join(
        user_output_dir,
        "message.txt"
    )

    if not os.path.exists(message_path):

        with open(
            message_path,
            "w"
        ):
            pass

    return message_path


# =====================
# SAVE FRONTEND CONTENT
# =====================

@app.route('/html', methods=['POST'])
@token_required
def save_content():

    try:

        if not request.is_json:

            return jsonify({
                'error': 'Request must be JSON'
            }), 400

        data = request.get_json()

        content = data.get('content')

        if not content:

            return jsonify({
                'error': 'Content not found in request'
            }), 400

        user_id = request.user.get(
            'id',
            'default'
        )

        print(
            f"Received content from user {user_id}:\n{content}",
            flush=True
        )

        # Make sure the complete workspace exists.
        workspace = ensure_user_workspace(
            user_id
        )

        user_output_dir = workspace['output']

        # Make sure message.txt exists.
        message_path = ensure_user_message_file(
            user_id
        )

        # Save frontend content.
        file_path = os.path.join(
            user_output_dir,
            "from_front_end.txt"
        )

        with open(
            file_path,
            "w"
        ) as f:

            f.write(content)

        print(
            f"Saved frontend content to {file_path}",
            flush=True
        )

        print(
            f"User message file: {message_path}",
            flush=True
        )

        return jsonify({

            'message':
                'Content saved successfully',

            'user_id':
                user_id

        }), 200

    except Exception as e:

        user_id = request.user.get(
            'id',
            'unknown'
        )

        print(
            f"ERROR saving content for user {user_id}: {e}",
            flush=True
        )

        return jsonify({
            'error': str(e)
        }), 500


# =====================
# SIMULATION
# =====================

@app.route('/html/simulate', methods=['POST'])
@token_required
def simulate():

    try:

        user_id = request.user.get(
            'id',
            'default'
        )

        # Make absolutely sure the user's complete
        # workspace exists before starting simulation.
        workspace = ensure_user_workspace(
            user_id
        )

        user_input_dir = workspace['input']

        user_output_dir = workspace['output']

        # Make sure message.txt exists.
        message_path = ensure_user_message_file(
            user_id
        )

        # ---------------------------------------------
        # Copy ping.json from the template input
        # into this user's isolated input directory.
        # ---------------------------------------------

        source = os.path.join(
            TEMPLATE_INPUT_DIR,
            "ping.json"
        )

        destination = os.path.join(
            user_input_dir,
            "ping.json"
        )

        if not os.path.exists(source):

            return jsonify({
                'error':
                    f'Source ping.json not found: {source}'
            }), 500

        shutil.copy2(
            source,
            destination
        )

        print(
            f"Simulation request received for user {user_id}",
            flush=True
        )

        print(
            f"User input directory: {user_input_dir}",
            flush=True
        )

        print(
            f"User output directory: {user_output_dir}",
            flush=True
        )

        print(
            f"Message file: {message_path}",
            flush=True
        )

        print(
            f"Simulation ping copied to: {destination}",
            flush=True
        )

        return jsonify({

            'ok':
                True,

            'user_id':
                user_id,

            'message_path':
                message_path,

            'input_dir':
                user_input_dir,

            'output_dir':
                user_output_dir

        }), 200

    except Exception as e:

        user_id = request.user.get(
            'id',
            'unknown'
        )

        print(
            f"ERROR creating simulation input "
            f"for user {user_id}: {e}",
            flush=True
        )

        return jsonify({
            'error': str(e)
        }), 500


# =====================
# START
# =====================

if __name__ == '__main__':

    app.run(
        host='0.0.0.0',
        port=80
    )