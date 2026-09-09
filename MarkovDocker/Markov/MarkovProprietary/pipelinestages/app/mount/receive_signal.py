from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import jwt
import os
import shutil

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}}
)

JWT_SECRET = os.environ.get("JWT_SECRET")

BASE_MOUNT = "/opt/app/MarkovProprietary/pipelinestages/app/mount"

TEMPLATE_INPUT_DIR = os.path.join(
    BASE_MOUNT,
    "input"
)

TEMPLATE_OUTPUT_DIR = os.path.join(
    BASE_MOUNT,
    "output"
)


# ============================================================
# AUTHENTICATION
# ============================================================

def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        token = None

        # ----------------------------------------------------
        # Cookie authentication
        # ----------------------------------------------------

        if "token" in request.cookies:

            token = request.cookies.get("token")

        # ----------------------------------------------------
        # Authorization header authentication
        # ----------------------------------------------------

        elif "Authorization" in request.headers:

            auth_header = request.headers.get(
                "Authorization"
            )

            parts = auth_header.split()

            if len(parts) != 2 or parts[0].lower() != "bearer":

                return jsonify({
                    "message": "Invalid token format"
                }), 403

            token = parts[1]

        # ----------------------------------------------------
        # No token
        # ----------------------------------------------------

        if not token:

            return jsonify({
                "message": "Authentication required"
            }), 401

        # ----------------------------------------------------
        # JWT verification
        # ----------------------------------------------------

        try:

            decoded = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"]
            )

            request.user = decoded

        except jwt.ExpiredSignatureError:

            return jsonify({
                "message": "Token has expired"
            }), 403

        except jwt.InvalidTokenError:

            return jsonify({
                "message": "Invalid or expired token"
            }), 403

        # ----------------------------------------------------
        # REQUIRE A USER ID
        #
        # Do NOT fall back to "default".
        # The authenticated JWT must contain the ID.
        # ----------------------------------------------------

        user_id = decoded.get("id")

        if user_id is None or str(user_id).strip() == "":

            return jsonify({
                "message": "Authenticated token contains no user ID"
            }), 401

        return f(*args, **kwargs)

    return decorated


# ============================================================
# USER PATH HELPERS
# ============================================================

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


# ============================================================
# USER WORKSPACE SETUP
# ============================================================

def ensure_user_workspace(user_id):

    user_id = str(user_id).strip()

    if not user_id:

        raise ValueError(
            "Cannot create workspace without user ID"
        )

    user_root = get_user_root(user_id)

    user_input_dir = get_user_input_dir(user_id)

    user_output_dir = get_user_output_dir(user_id)

    # --------------------------------------------------------
    # ALWAYS create the user's directories
    # --------------------------------------------------------

    os.makedirs(
        user_input_dir,
        exist_ok=True
    )

    os.makedirs(
        user_output_dir,
        exist_ok=True
    )

    print(
        f"[USER {user_id}] Ensuring workspace: "
        f"{user_root}",
        flush=True
    )

    # ========================================================
    # COPY TEMPLATE INPUT -> USER INPUT
    # ========================================================

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

            # Never overwrite user-owned files.

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
                f"[USER {user_id}] "
                f"Copied input template: {item}",
                flush=True
            )

    else:

        print(
            f"[USER {user_id}] WARNING: "
            f"Template input directory does not exist: "
            f"{TEMPLATE_INPUT_DIR}",
            flush=True
        )

    # ========================================================
    # COPY TEMPLATE OUTPUT -> USER OUTPUT
    # ========================================================

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

            # Never overwrite user-owned files.

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
                f"[USER {user_id}] "
                f"Copied output template: {item}",
                flush=True
            )

    else:

        print(
            f"[USER {user_id}] WARNING: "
            f"Template output directory does not exist: "
            f"{TEMPLATE_OUTPUT_DIR}",
            flush=True
        )

    print(
        f"[USER {user_id}] Workspace ready",
        flush=True
    )

    return {
        "root": user_root,
        "input": user_input_dir,
        "output": user_output_dir
    }


# ============================================================
# MESSAGE FILE
# ============================================================

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
            "w",
            encoding="utf-8"
        ):
            pass

    return message_path


# ============================================================
# SAVE FRONTEND CONTENT
#
# POST /html
#
# EXPECTED JSON:
#
# {
#     "content": "whatever the frontend sent"
# }
#
# RESULT:
#
# /mount/user-ID/output/from_front_end.txt
# ============================================================

@app.route("/html", methods=["POST"])
@token_required
def save_content():

    user_id = str(
        request.user["id"]
    ).strip()

    try:

        # ----------------------------------------------------
        # Require JSON
        # ----------------------------------------------------

        if not request.is_json:

            return jsonify({
                "error": "Request must be JSON"
            }), 400

        data = request.get_json(
            silent=True
        )

        if not isinstance(data, dict):

            return jsonify({
                "error": "Invalid JSON body"
            }), 400

        # ----------------------------------------------------
        # Get content
        # ----------------------------------------------------

        content = data.get("content")

        if content is None:

            return jsonify({
                "error": "Content not found in request"
            }), 400

        content = str(content)

        if not content.strip():

            return jsonify({
                "error": "Content is empty"
            }), 400

        # ----------------------------------------------------
        # Log exactly who sent it
        # ----------------------------------------------------

        print(
            f"[USER {user_id}] "
            f"Received content from frontend:",
            flush=True
        )

        print(
            content,
            flush=True
        )

        # ----------------------------------------------------
        # Make COMPLETE user workspace
        # ----------------------------------------------------

        workspace = ensure_user_workspace(
            user_id
        )

        user_output_dir = workspace["output"]

        # ----------------------------------------------------
        # Ensure message.txt
        # ----------------------------------------------------

        message_path = ensure_user_message_file(
            user_id
        )

        # ----------------------------------------------------
        # THIS IS THE IMPORTANT FILE
        #
        # User-specific:
        #
        # /mount/user-ID/output/from_front_end.txt
        # ----------------------------------------------------

        file_path = os.path.join(
            user_output_dir,
            "from_front_end.txt"
        )

        with open(
            file_path,
            "w",
            encoding="utf-8"
        ) as f:

            f.write(content)

        # ----------------------------------------------------
        # Verify the file was actually written
        # ----------------------------------------------------

        if not os.path.isfile(file_path):

            raise RuntimeError(
                f"from_front_end.txt was not created: "
                f"{file_path}"
            )

        print(
            f"[USER {user_id}] "
            f"Saved frontend content to: "
            f"{file_path}",
            flush=True
        )

        print(
            f"[USER {user_id}] "
            f"File exists: {os.path.exists(file_path)}",
            flush=True
        )

        # ----------------------------------------------------
        # Return success
        # ----------------------------------------------------

        return jsonify({

            "message":
                "Content saved successfully",

            "user_id":
                user_id,

            "file":
                file_path

        }), 200

    except Exception as e:

        print(
            f"[USER {user_id}] "
            f"ERROR saving content: {e}",
            flush=True
        )

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# SIMULATION
#
# POST /html/simulate
#
# Creates:
#
# /mount/user-ID/input/ping.json
#
# ============================================================

@app.route("/html/simulate", methods=["POST"])
@token_required
def simulate():

    user_id = str(
        request.user["id"]
    ).strip()

    try:

        # ----------------------------------------------------
        # Make sure complete workspace exists
        # ----------------------------------------------------

        workspace = ensure_user_workspace(
            user_id
        )

        user_input_dir = workspace["input"]

        user_output_dir = workspace["output"]

        # ----------------------------------------------------
        # Ensure message.txt
        # ----------------------------------------------------

        message_path = ensure_user_message_file(
            user_id
        )

        # ----------------------------------------------------
        # Template ping.json
        # ----------------------------------------------------

        source = os.path.join(
            TEMPLATE_INPUT_DIR,
            "ping.json"
        )

        # ----------------------------------------------------
        # User-specific ping.json
        # ----------------------------------------------------

        destination = os.path.join(
            user_input_dir,
            "ping.json"
        )

        if not os.path.isfile(source):

            return jsonify({
                "error":
                    f"Source ping.json not found: {source}"
            }), 500

        # ----------------------------------------------------
        # Copy ping.json
        # ----------------------------------------------------

        shutil.copy2(
            source,
            destination
        )

        # ----------------------------------------------------
        # Verify
        # ----------------------------------------------------

        if not os.path.isfile(destination):

            raise RuntimeError(
                f"ping.json was not created: "
                f"{destination}"
            )

        print(
            f"[USER {user_id}] "
            f"Simulation request received",
            flush=True
        )

        print(
            f"[USER {user_id}] "
            f"Input directory: {user_input_dir}",
            flush=True
        )

        print(
            f"[USER {user_id}] "
            f"Output directory: {user_output_dir}",
            flush=True
        )

        print(
            f"[USER {user_id}] "
            f"Message file: {message_path}",
            flush=True
        )

        print(
            f"[USER {user_id}] "
            f"ping.json copied to: {destination}",
            flush=True
        )

        return jsonify({

            "ok":
                True,

            "user_id":
                user_id,

            "message_path":
                message_path,

            "input_dir":
                user_input_dir,

            "output_dir":
                user_output_dir,

            "ping_path":
                destination

        }), 200

    except Exception as e:

        print(
            f"[USER {user_id}] "
            f"ERROR creating simulation input: {e}",
            flush=True
        )

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=80
    )