## Markov Eklypse
The Markov Eklypse performs protein-protein docking simulations with 96.63% accuracy. The ChatGPT clone is trained on the NIH database and outsources the proprietary Integral-SEQ logo from outside of its 
main directory along with the proprietary node module used to access the NIH database.
The Docking Simulator contains instructions for how it is to be used and access the AlphaFold and Protein Databanks. When the Simulator is finished the pdb file is automatically downloaded into the
users computer. Afterwards the outputted PDB file can be usted to test the model against the real world thereby accelerating personalized medicine by drastically reducing the number of experiments needed to be performed to obtain biomarkers, drug targets, interactions between a biologic and 
a protein responsible for a disease etc. The Markov Viewer can be used to have a quick view of the mutually bonded proteins.

## Installing the MarkovEklypse:
You will need git installed on azure for this.
First clone the repository with the following command:
1. git clone https://github.com/jenningsje/MarkovEklypse

## Installing the submodules:
1. git clone --recurse-submodules https://github.com/jenningsje/MarkovDocker5
2. git clone --recurse-submodules https://github.com/jenningsje/Markov-Bot
3. git clone --recurse-submodules https://github.com/jenningsje/Download
4. git clone --recurse-submodules https://github.com/jenningsje/fetch-get

## Dockerizing the image for the ChatBot (a.k.a. MarkovBot):
1. To Dockerize the ChatBot navigate to ./MarkovBot/docker-app relative to this respository and run the following commands:
2. GNU/Linux & Mac OSX:
3. chmod u+x dockerize.sh
4. ./dockerize.sh

## Dockerizing the image for the Docking Simulator (a.k.a. MarkovDocker):
1. Navigate to MarkovDocker
2. Run the following commands
4. chmod u+x allow_permissions.sh (allows permissions for all bash scripts)
5. ./activate_permissions.sh
6. ./build_Markov.sh

## access the app
1. access the Simulator on the following link: localhost:3000
2. access the ChatBot at localhost:8889
3. access the Download Page at localhost:3001
4. access the Markov Viewer: https://vercel.com/jenningsjes-projects/markov-viewer/28GUC7E91qMJ5qU3ZwJU5jFjyZna

## troubleshooting:
2. builds the Markov Eklypse and all of its components: build_Markov.sh, run ./build_Markov.sh
3. allow permissions for html files on the frontend: activate_html.sh, run ./activate_html.sh
4. reboot the Markov Eklypse: reboot_Markov.sh, run ./rebott_Markov.sh
5. reboot nginx server: reboot_html.sh, run ./reboot_html.sh
6. in case the ssh server was not successful upon running ./build_Markov.sh: ssh_connect.sh, run ./ssh_connect.sh
7. in case the ssh server is experiencing issues: inside_ssh_server.sh, run ./inside_ssh_server.sh

Software Requirments:
GNU/Linux, Microsoft Azure or MacOSX
git
Docker

James Jennings, Co-Founder, Integral-SEQ, jjennings@integral-seq.com
