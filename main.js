"use strict"

const Discord = require("discord.js")
const Blessed = require("blessed")

const screen = Blessed.screen({
    smartCSR: true,
    dockBorders: true
})

screen.title = "Discord"

const channelList = Blessed.list({
    parent: screen,

    top: 0,
    left: 0,
    height: '100%',
    width: '20%',

    tags: true,
    keys: true,
    vi: true,

    style: {
        item: {
            fg: 'white',
            bg: 'black'
        },
        selected: {
            fg: 'black',
            bg: 'white'
        }
    }

})

// Line demarking edge of channels list
Blessed.line({
    parent: screen,

    top: 0,
    left: '20%',
    height: '100%',
    orientation: 'vertical'
})

const chat = Blessed.log({
    parent: screen,

    bottom: 2,
    right: 0,
    width: '80%'
})

Blessed.line({
    parent: screen,

    bottom: 1,
    right: 0,
    width: '80%',
    orientation: 'horizontal'
})

const entryBox = Blessed.textbox({
    parent: screen,

    bottom: 0,
    right: 0,
    height: 1,
    width: '80%',

    inputOnFocus: true
})

const messagebox = Blessed.message({
    parent: screen,

    top: 'center',
    left: 'center',
    height: 'shrink',
    width: 'half',

    tags: true,
    keys: true,
    hidden: true,

    border: 'line'
})

screen.key(['q', 'C-c'], quit)

const client = new Discord.Client();

const collapsedServers = []
let currentChannel = null

function quit() {
    var question = Blessed.question({
        parent: screen,
        top: 'center',
        left: 'center',
        width: 'half',
        height: 'shrink',

        keys: true,
        tags: true,

        border: 'line',
        label: ' Quitting '
    })

    question.ask('Are you sure you want to quit?', (err, value) => {
        if (value) {
            client.logout()
            screen.destroy()
            process.exit(0)
        } else {
            question.destroy()
            screen.render()
        }
    })
}

function updateChannelList() {
    let channelStrings = []

    client.servers.forEach(server => {
        channelStrings.push(server.name)
        if (collapsedServers.includes(server.name)) return

        server.channels.forEach(channel => {
            if (channel.type != 'text') return
            channelStrings.push("├─ " + channel.name)
        })
        channelStrings.push("")
    })

    channelList.setItems(channelStrings)
}
function addMessage(message) {
    let userPad = ("               " + message.author.name).slice(-15)
    chat.add(userPad + "│" + message.content)
}
function selectChannel(name) {
    let channel = client.channels.get("name", name)
    currentChannel = channel

    chat.add("Loading logs...")
    client.getChannelLogs(channel, screen.height + 50)
        .then(messages => {
            messages.reverse()
            messages.forEach(addMessage)
            screen.render()
        })

    entryBox.focus()
    screen.render()
}

entryBox.on('submit', () => {
    const text = entryBox.value
    client.sendMessage(currentChannel, text)
    entryBox.clearValue()
    entryBox.focus()
    screen.render()
})

entryBox.key(["C-c"], () => {
    entryBox.clearValue()
    screen.render()
})

channelList.key(["i"], () => {
    channelList.enterSelected()
})

channelList.on('select', box => {
    let item = box.content
    if (item.length === 0) {
        // End of server seperator - ignore
    } else if (item.startsWith("├─ ")) {
        // Channel
        var channelName = item.substring(3)

        selectChannel(channelName)
    } else {
        // Server
        var serverName = item

        if (collapsedServers.includes(serverName)) {
            let index = collapsedServers.indexOf(serverName)
            collapsedServers.splice(index)
        } else {
            collapsedServers.push(item)
        }
        updateChannelList()
    }
    screen.render()
})

client.on('ready', () => {
    updateChannelList()
    screen.render()
})

client.on('message', message => {
    if (currentChannel === null) return
    if (message.channel.id === currentChannel.id) {
        addMessage(message)
    }
    screen.render()
})

function message(message, timeout = 0, title = "Message", callback = null) {
    messagebox.setLabel(`{blue-fg}${title}{/blue-fg}`)
    messagebox.display(message, timeout, callback)
}
function fail(message, title = "Error") {
    messagebox.setLabel(`{red-fg}${title}{/red-fg}`)
    messagebox.display(`{red-fg}${message}\nPress any key to exit...{/red-fg}`, 0, () => process.exit(1))
}

function login() {
    var loggedIn = false
    message("Logging in...", 30, "Login", () => { if (!loggedIn) fail("Login timed out", "Login Error") })

    client.login(process.argv[2], process.argv[3])
        .then(() => {
            loggedIn = true
            messagebox.hide()
            screen.render()
        })
        .catch((err) => {
            fail(err, "Login Failed")
        })
}

for (let i = 0; i<200; i++) {
    chat.add("")
}

login()
screen.render()
