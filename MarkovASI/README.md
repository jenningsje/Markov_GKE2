* The Markov Eklypse ASI, this verion is trained on every api and interacts with the terminal and browser as well for a fully autonomous system
* pull the latest version of ollama: docker pull ollama: docker pull ollama/ollama
8 navigate to MarkovASIopen repository
* run ollama docker image: docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
* install granite3.1-dense reasoning model:
	1. docker ps
	2. docker exec -it <ollama-container-id> ollama pull granite3.1-dense
	4. docker exec -it <ollama-container-id> ollama run granite3.1-dense
	9. ollama is setup now setup codel below
	10. docker run \
    -e OLLAMA_MODEL=granite3.1-dense \
    -p 8887:8080 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    ghcr.io/semanser/codel:latest

you may need to restart some containers from time to time and adjust the resources of docker
pulling the codel image may also be required
