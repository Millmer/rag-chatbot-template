# rag-chatbot
This repo is an stripped down version of a RAG chatbot I worked on and deployed. It can be used as a template to launch similar things.

It is a fictitious chatbot called "GastroGuru", a bot that can suggest recipes based on ingredients you have at home, dietary restrictions, or desired cuisine. It can fetch recipes from a vast database, offering cooking tips and alternatives for missing ingredients.

Repo containing the Backend API and Frontend for serving the Chatbot. Responsible for receiving the user requests and streaming the OpenAI responses using `Socket.io`.

Currently it is set to using the OpenAI model `gpt-3.5-turbo-16k` for chat completion. In production you can use whatever model best fits your needs.
**_Note:_** If you use a fine-tuned model, be sure to include it's token limits in the backend config.

## Backend Architecture

**_Note:_** The Ingestion Phase is part of the [rag-ingestion](https://github.com/Millmer/rag-ingestion-template) repo

![Chatbot with RAG Arch](./rag-chatbot-arch.excalidraw.png)

_(Drawn in Excalidraw - use this [VSCode plugin](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor) to modify in IDE)_

## Backend Run
```sh
cd backend
npm run dev
```

Ensure that you have a valid `.env.local` environment variables file. See the `.env.example` to see what you need.

## Backend Update
Sync local changes:
```sh
cd backend
npm run deploy:test
```

Go into the server and restart:
```sh
pm2 restart ecosystem.config.js
```

If `node_modules` changed, the be sure to do a fresh install on the server with:
```sh
cd chatbot
npm install
```

## Backend Setup
The chatbot is hosted inside a Digital Ocean droplet as it requires streaming/sockets to work and they're not compatible with AWS Lambda (atm).

To setup a new server we need to install the required software/packages/libraries:
- NodeJS v18 or greater
- npm
- pm2
- nginx (should be installed already due to OS config)

### Backend Setup Nodejs
Following [this setup](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-22-04)

```sh
sudo apt update
sudo apt install nodejs
sudo apt install npm
```

### Backend Setup pm2
__Locally__
Copy the `ecosystem.config.js` across to your server:
```sh
scp ecosystem.config.js root@YOUR_IP_ADDRESS:/root
```

Sync the files with the deploy command:
```sh
cd backend
npm run deploy:test
```

__Inside the server__

First install the packages:
```sh
cd chatbot
npm install
cd ..
```

Then install and run `pm2`:
```sh
npm install pm2 -g
pm2 start ecosystem.config.js
```

For improved logging install the module [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) to automatically rotate and keep all the logs file using a limited space on disk.
```sh
pm2 install pm2-logrotate
```


### Backend nginx config for sockets
```
location /chatbot/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;

        proxy_pass http://localhost:3001;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
}
```

## Frontend Run
```
cd frontend
npm run dev
```

Ensure you have the correct `.env` variables.

If running the BE locally, the `PUBLIC_CHATBOT_API_URL=http://localhost:3001/chatbot`

## Frontend Deploy
Go inside the `frontend` folder and run the following command:
```
npm run deploy
```

**_Note:_** Before running this command, modify the AWS profile variable named `my-aws-profile` and the S3 bucket location and the CloudFront distribution ID.
Assuming you have the AWS profile installed locally it will build the Svelte project, upload to the S3 bucket and invalidate the CloudFront distribution cache.

You can view the results at your CF distribution providing you supply the correct `?key=` param.