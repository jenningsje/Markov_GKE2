import sys
import time
import logging
import os
import shutil

sys.path.append("/opt/app/MarkovProprietary/pipelinestages")
sys.path.append("..")

from gemmi import *
from fetch_from_mount import *
from fetch_from_alphafold import *
from fetch_protein import *
from simulate import *
from calibration import *
from usr import *
from usr import get_user_id


# ============================================================
# USER ID
# ============================================================

user_id = get_user_id()

USER_MOUNT = (
    f"/opt/app/MarkovProprietary/pipelinestages/"
    f"app/mount/user-{user_id}"
)

USER_INPUT = os.path.join(USER_MOUNT, "input")
USER_OUTPUT = os.path.join(USER_MOUNT, "output")


logging.info(
    f"LightDock worker initialized for user {user_id}"
)

logging.info(
    f"USER_MOUNT={USER_MOUNT}"
)

logging.info(
    f"USER_INPUT={USER_INPUT}"
)

logging.info(
    f"USER_OUTPUT={USER_OUTPUT}"
)


# ============================================================
# FRONT-END SIGNALS
# ============================================================

from_alphafold = (
    "file not available on the protein databank "
    "fetching file from the alphafold databank instead..."
)

from_pdb = "fetching from the pdb..."

simulation_finished = "docking simulation finished..."


# ============================================================
# MARKOV
# ============================================================

def Markov():

    while True:

        try:

            logging.info(
                f"current directory is: {os.getcwd()} test1"
            )

            # ------------------------------------------------
            # Enter LightDock swarm directory
            # ------------------------------------------------

            try:
                logging.info(
                    f"current directory is: {os.getcwd()} test2"
                )

                os.chdir("/opt/app/lightdock/swarm_0")

            except Exception:
                logging.info(
                    f"current directory is: {os.getcwd()} test3"
                )

            print(
                f"current directory is {os.getcwd()}"
            )

            # ------------------------------------------------
            # Clean previous LightDock generated files
            # ------------------------------------------------

            cleanup_lightdock()

            # ------------------------------------------------
            # Ensure user output signal file exists
            # ------------------------------------------------

            from_front_end_path = os.path.join(
                USER_OUTPUT,
                "from_front_end.txt",
            )

            try:

                os.makedirs(
                    USER_OUTPUT,
                    exist_ok=True,
                )

                with open(
                    from_front_end_path,
                    "w",
                ):
                    pass

            except Exception as e:

                logging.error(
                    f"Unable to initialize from_front_end.txt: {e}",
                    exc_info=True,
                )

                raise

            # ------------------------------------------------
            # Tell the frontend to provide the first protein
            # ------------------------------------------------

            from_front_end_size = os.path.getsize(
                from_front_end_path
            )

            if from_front_end_size == 0:

                message_path = os.path.join(
                    USER_OUTPUT,
                    "message.txt",
                )

                with open(
                    message_path,
                    "w",
                ) as message:

                    message.write(
                        "fetch the next two proteins..."
                    )

                logger.info(
                    "fetch the next two proteins..."
                )

                time.sleep(1)

            # ------------------------------------------------
            # Wait for first protein name
            # ------------------------------------------------

            input_path = os.path.join(
                USER_INPUT,
                "names.txt",
            )

            os.makedirs(
                USER_INPUT,
                exist_ok=True,
            )

            # Empty names.txt so this iteration starts clean.
            with open(input_path, "w"):
                pass

            while True:

                file_size = os.path.getsize(
                    input_path
                )

                print(file_size)

                if file_size > 0:
                    break

                logger.info(
                    f"waiting for user input for user {user_id}"
                )

                time.sleep(1)

            # ------------------------------------------------
            # Read first protein
            # ------------------------------------------------

            with open(
                input_path,
                "r",
            ) as names:

                names_lines = names.readlines()

            logger.info(
                f"names_lines: {names_lines}"
            )

            if not names_lines:
                continue

            first_protein = names_lines[0].strip()

            logger.info(
                f"User {user_id} requested protein: "
                f"{first_protein}"
            )

            # ------------------------------------------------
            # Fetch first protein
            # ------------------------------------------------

            fetch_protein(
                first_protein,
                "/opt/app/lightdock/prot1.pdb",
            )

            logger.info(
                f"current working directory: {os.getcwd()}"
            )

            logger.info("test")

            # Clear user input after consuming it.
            with open(input_path, "w"):
                pass

            # ------------------------------------------------
            # Wait for frontend response
            # ------------------------------------------------

            while (
                os.path.getsize(from_front_end_path) == 0
            ):

                logger.info(
                    f"waiting for frontend signal "
                    f"for user {user_id}"
                )

                time.sleep(1)

            with open(
                from_front_end_path,
                "r",
            ) as from_front_end:

                from_front_end_lines = (
                    from_front_end.readlines()
                )

            if not from_front_end_lines:
                continue

            first_front_end_line = (
                from_front_end_lines[0]
                .split("\n")[0]
                .strip()
            )

            # ------------------------------------------------
            # Handle frontend response
            # ------------------------------------------------

            while first_front_end_line not in (
                from_alphafold,
                from_pdb,
            ):

                logger.info(
                    f"first_front_end_line is: "
                    f"{first_front_end_line}"
                )

                logger.info(
                    f"from_pdb is: {from_pdb}"
                )

                logger.info(
                    "waiting for signal from front end..."
                )

                time.sleep(1)

                if (
                    first_front_end_line
                    ==
                    "that protein does not exist in the "
                    "protein databank or the alphafold "
                    "databank, please try another query"
                ):

                    logger.info(
                        "inside protein-not-found statement"
                    )

                    # ------------------------------------------------
                    # Wait for another query in the USER workspace.
                    # ------------------------------------------------

                    retry_input_path = os.path.join(
                        USER_INPUT,
                        "names.txt",
                    )

                    while (
                        not os.path.isfile(
                            retry_input_path
                        )
                        or
                        os.path.getsize(
                            retry_input_path
                        ) == 0
                    ):

                        logger.info(
                            f"no user input for user {user_id}"
                        )

                        time.sleep(1)

                    with open(
                        retry_input_path,
                        "r",
                    ) as names:

                        names_lines = (
                            names.readlines()
                        )

                    if names_lines:

                        fetch_protein(
                            names_lines[0].strip(),
                            "/opt/app/lightdock/prot1.pdb",
                        )

                        with open(
                            retry_input_path,
                            "w",
                        ):
                            pass

                # Re-read the frontend signal every iteration.
                with open(
                    from_front_end_path,
                    "r",
                ) as from_front_end:

                    from_front_end_lines = (
                        from_front_end.readlines()
                    )

                if from_front_end_lines:

                    first_front_end_line = (
                        from_front_end_lines[0]
                        .split("\n")[0]
                        .strip()
                    )

            # ------------------------------------------------
            # Prepare for second protein
            # ------------------------------------------------

            message_path = os.path.join(
                USER_OUTPUT,
                "message.txt",
            )

            with open(
                message_path,
                "w",
            ) as message:

                message.write(
                    "fetch the next protein..."
                )

            logger.info(
                "fetch the next protein..."
            )

            time.sleep(1)

            # ------------------------------------------------
            # Wait for second protein
            # ------------------------------------------------

            new_file_size = 0

            while new_file_size == 0:

                if os.path.isfile(input_path):

                    new_file_size = os.path.getsize(
                        input_path
                    )

                if new_file_size == 0:

                    logger.info(
                        f"no user input for user {user_id}"
                    )

                    time.sleep(1)

            with open(
                input_path,
                "r",
            ) as names:

                names_lines = names.readlines()

            if not names_lines:
                continue

            second_protein = names_lines[0].strip()

            logger.info(
                f"User {user_id} requested second protein: "
                f"{second_protein}"
            )

            logger.info(
                "end of for loop"
            )

            # ------------------------------------------------
            # Fetch second protein
            # ------------------------------------------------

            fetch_protein(
                second_protein,
                "/opt/app/lightdock/prot2.pdb",
            )

            logger.info("test")

            with open(input_path, "w"):
                pass

            # ------------------------------------------------
            # Wait for frontend confirmation
            # ------------------------------------------------

            with open(
                from_front_end_path,
                "r",
            ) as from_front_end:

                from_front_end_lines = (
                    from_front_end.readlines()
                )

            if from_front_end_lines:

                first_front_end_line = (
                    from_front_end_lines[0]
                    .split("\n")[0]
                    .strip()
                )

            else:

                first_front_end_line = ""

            while len(first_front_end_line) == 0:

                logger.info("test")

                time.sleep(1)

                if (
                    first_front_end_line
                    ==
                    "that protein does not exist in the "
                    "protein databank or the alphafold "
                    "databank, please try another query"
                ):

                    logger.info(
                        "inside protein-not-found statement"
                    )

                with open(
                    from_front_end_path,
                    "r",
                ) as from_front_end:

                    from_front_end_lines = (
                        from_front_end.readlines()
                    )

                if from_front_end_lines:

                    first_front_end_line = (
                        from_front_end_lines[0]
                        .split("\n")[0]
                        .strip()
                    )

            # ------------------------------------------------
            # Tell frontend simulator is ready
            # ------------------------------------------------

            with open(
                message_path,
                "w",
            ) as message:

                message.write(
                    "docking simulator ready..."
                )

            logger.info(
                "docking simulator ready..."
            )

            time.sleep(1)

            # ------------------------------------------------
            # Start simulation
            # ------------------------------------------------

            os.chdir(
                "/opt/app/lightdock"
            )

            time.sleep(1)

            ping_path = os.path.join(
                USER_INPUT,
                "ping.json",
            )

            while not os.path.isfile(
                ping_path
            ):

                time.sleep(1)

            logger.info(
                f"Starting simulator for user {user_id}"
            )

            simulator()

            # ------------------------------------------------
            # Recreate swarm directory after simulation
            # ------------------------------------------------

            try:

                os.makedirs(
                    "swarm_0",
                    exist_ok=True,
                )

            except Exception as e:

                logger.error(
                    f"Error occurred: {e}",
                    exc_info=True,
                )

                time.sleep(1)

        except Exception as e:

            logger.error(
                f"Error occurred for user {user_id}: {e}",
                exc_info=True,
            )

            time.sleep(1)

        # ----------------------------------------------------
        # Return to THIS user's input directory.
        # ----------------------------------------------------

        os.chdir(
            USER_INPUT
        )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    logging.info(
        f"Launching Markov worker for user {user_id}"
    )

    Markov()