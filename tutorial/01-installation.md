Getting up and running requires just a few steps, but this can be tricky, depending on your platform and current environment. Please follow the directions for your environment.

# All environments

### First, clone the repository
`git clone https://github.com/XRFoundation/XREngine --depth 1`

### Ensure you are on Node 16 or above

You **must** have Node 16 or above installed.

A version manager can be helpful for this:
 - NodeJS only: [NVM](https://github.com/nvm-sh/nvm)
 - Polyglot: [ASDF](https://github.com/asdf-vm/asdf)

Before running the engine, please check `node --version`
If you are using a node version below 16, please update or nothing will work. You will know you are having issues if you try to install at root and are getting dependency errors.

### Docker is your friend

You don't need to use Docker, but it will make your life much easier.
You can get it [here](https://docs.docker.com/).
If you don't wish to use Docker, you will need to setup mariadb and redis on your machine. You can find credentials in `xrengine/scripts/docker-compose.yml`

## Docker

You can quickstart locally using docker, if you don't have node installed or just want to test the latest.

``` bash
## Get local IP address
Use a tool like ifconfig to get your local IP address.

## Start local databases
cd scripts
docker-compose up

When the logging stops, that indicates that the databases have been created and are running.

Ctrl+c out of that, then from scripts run ./start-all-docker.sh (This must be run every time
you start your machine anew)

## Build the image
DOCKER_BUILDKIT=1 docker build -t xrengine --build-arg MYSQL_USER=server --build-arg MYSQL_PASSWORD=password --build-arg MYSQL_HOST=127.0.0.1 --build-arg MYSQL_DATABASE=xrengine --build-arg MYSQL_PORT=3304 --build-arg VITE_SERVER_HOST=localhost --build-arg VITE_SERVER_PORT=3030 --build-arg VITE_GAMESERVER_HOST=localhost --build-arg VITE_GAMESERVER_PORT=3031 --build-arg VITE_LOCAL_BUILD=true --build-arg CACHE_DATE="$(date)" --network="host" .

## Run the server to seed the database, wait a couple minutes, then delete it
docker run -d --name server --env-file .env.local.default -e "SERVER_MODE=api" -e "FORCE_DB_REFRESH=true" --network host xrengine
docker logs server -f
-Wait for the line "Server Ready", then Ctrl+c out of the logs-
docker container stop server
docker container rm server

## Run the images
docker run -d --name serve-local --env-file .env.local.default -e "SERVER_MODE=serve-local" --network host xrengine
docker run -d --name server --env-file .env.local.default -e "SERVER_MODE=api" -e "GAMESERVER_HOST=<local IP address" --network host xrengine
docker run -d --name client --env-file .env.local.default -e "SERVER_MODE=client" --network host xrengine
docker run -d --name world --env-file .env.local.default -e "SERVER_MODE=realtime" -e "GAMESERVER_HOST=<local IP address>" --network host xrengine
docker run -d --name channel --env-file .env.local.default -e "SERVER_MODE=realtime" -e "GAMESERVER_HOST=<local IP address>" -e "GAMESERVER_PORT=3032" --network host xrengine

## Delete containers, if you want to run a new build, or just get rid of them
docker container stop serve-local
docker container rm serve-local
docker container stop server
docker container rm server
docker container stop client
docker container rm client
docker container stop world
docker container rm world
docker container stop channel
docker container rm channel

```

### Mediasoup is a powerful beast you must tame
The vast majority of people get stuck on the mediasoup installation because it requires C++ source code to be compiled on your machine, which requires node-gyp and python and other dependencies.

*It is extremely important that you refer to these instructions before continuing*
https://mediasoup.org/documentation/v3/mediasoup/installation/

### Installing on Windows with WSL2
Note: **You must have WSL2 installed for these instructions to work**

First, open a wsl prompt. Then type these commands:
```
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install build-essential
npm install
npm install mediasoup@3 --save
sudo service docker start
npm run dev-docker
npm run dev-reinit
```

Please make sure you've followed everything in these instructions:
https://mediasoup.org/documentation/v3/mediasoup/installation/

### Installing on Native Windows
1. install python 3 and add python installation directory path to 'path' env variable.

2. Install node js

3. install Visual studio community edition with build tools. follow next steps. If mediasoup will not installed properly then modify Visual studio setup to add c++ and Node.js support.

4. add path to MSbuild.exe (which is present into vs installation folder) into 'path' variable
for example:``` C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin```

5. install all dependences using npm.

6. If error persists then check for typos in environment variables.

7. If you are on Windows, you can use docker-compose to start the scripts/docker-compose.yml file, or install mariadb and copy the login/pass and database name from docker-compose or .env.local -- you will need to create the database with the matching name, but you do not need to populate it

./start-db.sh only needs to be run once. If the docker image has stopped, start it again with:

```
    docker container start xrengine_db
```

8. Check your WSL Config for any incorrect networking settings. 
https://docs.microsoft.com/en-us/windows/wsl/wsl-config#network

### Installing on a Mac 

1. Go to the root and run 

```
   npm install
   npm run dev-docker
   npm run dev-reinit
```

Or if you are on a M1 based Mac

(Recommended)
1) Duplicate the Terminal app, and configure it to run in Rosetta 
2) Run the above in Rosetta Terminal

(Not recommended) 
```
   yarn install
```

This is because on Apple chips the node-darwin sometimes doesn't get installed properly and by using yarn it fixes the issue.

2. Have docker started in the background and then in the terminal type 

```
   npm run dev
```

This will open the mariaDB and SQL scripts on the docker and will start the servers 

3. To make sure your environment is set and running properly just go to https://localhost:3000/location/default and you should be able to walk around an empty 3D scene

```
Note : Make sure you are on Node >= 16 and have docker running. 
```

### Troubleshooting Mac 

* If you find issues on your terminal that says that access-denied for user 'server@localhost' then you can use this command 

```
brew services stop mysql
```

* If you find issue on your terminal that says 'An unexpected error occurred: "expected workspace package' while using yarn then you can use this command in your terminal 

```
   yarn policies set-version 1.18.0
```

As yarn > 1.18 sometimes doesn't work properly with lerna. 


## Easy setup
If you are lucky, this will just work. However, you will may encounter some issues. Make sure you are running Node 16, and check your dependencies.

```
cd path/to/xrengine
npm install
npm run dev-docker
npm run dev-reinit
npm run dev
```

This will automatically setup (if necessary) and run redis/mariadb docker containers, and XRengine client/server/game-server instances.

In a browser, navigate to https://127.0.0.1:3000/location/default

The database seeding process creates a test empty location called 'test'. It can be navigated to by going to 'https://127.0.0.1:3000/location/default'

As of this writing, the cert provided in the xrengine package for local use is not adequately signed. Browsers will throw up warnings about going to insecure pages. You should be able to tell the browser to ignore it, usually by clicking on some sort of 'advanced options' button or link and then something along the lines of 'go there anyway'.

Chrome sometimes does not show a clickable option on the warning. If so, just type ```badidea``` or ```thisisunsafe``` when on that page. You don't enter that into the address bar or into a text box, Chrome is just passively listening for those commands.

## Advanced Setup

If you want to setup XREngine docker instances, client, server, and/or game-server manually, follow these directions. The advanced setup is recommended for all users, in order to understand more about everything that going on.

### 1.  Install your dependencies 
```
cd path/to/xrengine
npm install
npm run dev-docker
npm run dev-reinit
```

You should not need to use sudo in any case.

Error with mediasoup?https://mediasoup.org/documentation/v3/mediasoup/installation/

### 2. Make sure you have a mysql database installed and running -- our recommendation is Mariadb. 
    
We've provided a docker container for easy setup:

```
cd scripts && sudo bash start-db.sh
```

This creates a Docker container of mariadb named xrengine_db. You must have docker installed on your machine for this script to work.
If you do not have Docker installed and do not wish to install it, you'll have to manually create a MariaDB server.
   
The default username is 'server', the default password is 'password', the default database name is 'xrengine', the default hostname is '127.0.0.1', and the default port is '3306'.
   
   Seeing errors connecting to the local DB? **Try shutting off your local firewall.**

### 3. Open a new tab and start the Agones sidecar in local mode

   ```
   cd scripts
   sudo bash start-agones.sh
   ```
   
   You can also go to vendor/agones/ and run
   
   ```./sdk-server.linux.amd64 --local```
   
   If you are using a Windows machine, run
   
   ```sdk-server.windows.amd64.exe --local```
   
   and for mac, run
   
   ```./sdk-server.darwin.amd64 --local```

### 4. Start the server in database seed mode

   Several tables in the database need to be seeded with default values.
   Run ```npm run dev-reinit``` or if on windows ```npm run dev-reinit-windows```
   After several seconds, there should be no more logging.
   Some of the final lines should read like this:
   ```
   Server Ready
   Executing (default): SET FOREIGN_KEY_CHECKS = 1
   Server EXIT
   ```
   
   At this point, the database has been seeded.

### 5. Local file server configuration
   If the .env.local file you have has the line 
   ```STORAGE_PROVIDER=local```
   then the scene editor will save components, models, scenes, etc. locally 
   (as opposed to storing them on S3). You will need to start a local server
   to serve these files, and make sure that .env.local has the line
   ```LOCAL_STORAGE_PROVIDER="localhost:8642"```.
   In a new tab, go to ```packages/server``` and run ```npm run serve-local-files```.
   This will start up ```http-server``` to serve files from ```packages/server/upload```
   on ```localhost:8642```.
   You may have to accept the invalid self-signed certificate for it in the browser;
   see 'Allow local file http-server connection with invalid certificate' below.

### 6. Open two/three separate tabs and start the API server, gameserver and client
   In /packages/server, run ```npm run dev``` which will launch the api server, game server and file server.
   If you are not using gameservers, you can instead run ```npm run dev-api-server``` in the api server.
   In the final tab, go to /packages/client and run ```npm run dev```.
   If you are on windows you need to use ```npm run dev-windows``` instead of ```npm run dev```.

### 7. In a browser, navigate to https://127.0.0.1:3000/location/default
   The database seeding process creates a default empty location called 'default'.
   It can be navigated to by going to 'https://127.0.0.1:3000/location/default'.
As of this writing, the cert provided in the XREngine package for local use is not adequately signed. You can create signed certificates and replace the default ones, but most developers just ignore the warnings. Browsers will throw up warnings about going to insecure pages. You should be able to tell the browser to ignore it, usually by clicking on some sort of 'advanced options' button or link and then something along the lines of 'go there anyway'.

### Admin System
You can administrate many features from the admin panel at https://localhost:3000/admin

How to make a user an admin:

Create a user at `/login`

To locate your User ID:
In Chrome Dev Tools console, write `copy(userId)`. This will copy your User ID (As shown in attached screenshot). Paste it in and run the following command in a 'nix shell (e.g. Bash, ZSH):

`npm run make-user-admin -- --id={COPIED_USER_ID}`

Example:
`npm run make-user-admin -- --id=c06b0210-453e-11ec-afc3-c57a57eeb1ac`

![image](https://user-images.githubusercontent.com/43248658/142813912-35f450e1-f012-4bdf-adfa-f0fa2816160f.png)

2. TODO: Improve with email/phone ID support

Alternate Method: 
1. Look up in User table and change userRole to 'admin' 
2. Dev DB credentials can be found here: packages/ops/docker-compose-local.yml#L42
3. Suggested: beekeeperstudio.io

Test user Admin privileges by going to `/admin`
