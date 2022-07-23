Flik
============
Flik is an automation suite to speed up the deployment of Phishmonger, Humble Chameleon, (and Rizzo coming soon). It uses ansible for reliable deployment and integrates with Gandi to make DNS and Cert generation a breeze.

Installation 
============
Clone it, NPM it, run it. Keep in mind that this tool is meant to be run on your local host and uses Ansible to remotely configure your servers over SSH:

```
git clone https://github.com/fkasler/flik.git
cd flik
npm install
node index.js
```

If you have not installed Ansible, then you will need to do so. There is an NPM job in the project for it:

```
npm run build
```

OR you can just run the same pip command yourself:

```
python3 -m pip install --user ansible
```

Make sure that Ansible is in your PATH. Node will throw an "ENOENT" error when it can't find the ansible binary. To include ansible in your PATH, you may need something *like* the following in your ~/.bash_profile:

```
export PATH=/Users/$USER/Library/Python/3.8/bin:$PATH
```

Adjust per your OS and setup. You should get a path when testing with:

```
which ansible
```

Phishmonger integrates well with Telegram. If you do not have a Telegram account, you can download the app and register in a couple of minutes [here](https://telegram.org/apps). Then you will want to create a bot to send you campaign updates:

* Start a chat with the BotFather
* Send the BotFather the start message ```/start```
* Send the BotFather the newbot message ```/newbot```
* Answer the BotFather's questions to finsh setting up the bot. Keep in mind that your bot name will be searchable by all Telegram users.
* Save your bot's API key for future reference. 
* Start a chat with your bot and then navigate to [https://api.telegram.org/bot123456789:jbd78sadvbdy63d37gda37bd8/getUpdates](https://api.telegram.org/bot123456789:jbd78sadvbdy63d37gda37bd8/getUpdates) and replace your API key in the URL. IT NEEDS TO START WITH 'bot' SO KEEP THAT PART OF THE URL.
* You will likely get a blank result until you send your bot another message and refresh the getUpdates URL.
* Once you see updates from the URL, note your 'chat_id' to fill out your Phishmonger options. You're bot will now be able to send you live campaign updates.

To Update
============
```
git pull
git submodule foreach git pull origin master
```

Usage
=====

Start the server on your local host:

```
node index.js
```

Visit [http://localhost:4000](http://localhost:4000) and fill out your domain and server IP options

Clear junk DNS records and set DNS records to point at your server's IP with the provided buttons

Humble Chameleon is meant to be used with Phishmonger. Set up a Phishmonger domain first. Some of your HC options will be autofilled as you go.

If you are setting up Humble Chameleon for the first time, then select the "Deploy Humble Chameleon (intial setup only)" button

If you are setting up another HC domain, then select the "Add New Domain(After HC is running)" button. If this step runs into issues, you may need to manually restart nginx on your server, troubleshoot, and try again.

Sit back and watch Ansible do its deployment magic

Keep in mind that you will still need to start Humble Chameleon and Phishmonger in tmux or screen sessions after it is all done setting up

Pwn N00bs, have fun, hack the planet :)
