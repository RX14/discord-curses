import {State} from "./state"
import {Store} from "redux"
import * as actions from "./actions"
import {logger} from "./log"
import {doCorked} from "./utils"
import {store} from "../main"
import * as utils from "./utils"
const Discord = require("discord.js")

export type ServerId = any
export interface Server {
    id: ServerId

    name: string
}

function serverFromDiscord(server): Server {
    return Object.freeze({
        id: server.id,
        name: server.name
    })
}

export type ChannelId = any
export interface Channel {
    id: ChannelId

    name: string
    serverId: ServerId
}

function channelFromDiscord(channel): Channel {
    return Object.freeze({
        id: channel.id,
        name: channel.name,
        serverId: channel.server.id
    })
}

export type MessageId = any
export interface Message {
    id: MessageId

    channel: ChannelId
    username: string
    content: string
}

function messageFromDiscord(message): Message {
    let content = message.cleanContent
    if (message.attachments.length > 0) {
        if (content.length > 0) content += " "
        content += `[attachments: ${message.attachments.map(a => a.url).join(", ")} ]`
    }

    return {
        id: message.id,

        channel: message.channel.id,
        username: message.author.name,
        content
    }
}

export class DiscordClient {
    private client = new Discord.Client()
    private prevState: State

    login(email: string, password: string, store: Store<State>) {
        store.dispatch(actions.startLogin())
        this.client.login(email, password)
            .then(() => { store.dispatch(actions.loggedIn()) })
            .catch((err) => { store.dispatch(actions.loginError(err)) })
    }

    handlers(store: Store<State>) {
        const client = this.client

        client.on("ready", () => {
            doCorked(store, () => {
                // Add initial servers
                client.servers.forEach(server => {
                    store.dispatch(actions.addServer(serverFromDiscord(server)))

                    server.channels.forEach(channel => {
                        if (channel.type != 'text') return
                        store.dispatch(actions.addChannel(channelFromDiscord(channel)))
                    })
                })
            })
        })

        client.on("message", (message) => {
            store.dispatch(actions.chatMessage(messageFromDiscord(message)))
        })
    }

    handleState(state: State) {
        const prevState = this.prevState || state

        if (state.loadingChannelLogs != prevState.loadingChannelLogs) {
            if (state.loadingChannelLogs) {
                this.client.getChannelLogs(state.currentChannelId, state.screenHeight + 50)
                    .then(messages => {
                        messages.reverse()
                        utils.doCorked(store, () => {
                            messages.forEach(message => {
                                store.dispatch(actions.chatMessage(messageFromDiscord(message)))
                            })
                        })

                        store.dispatch(actions.finishLogLoading())
                    })
            }
        }

        this.prevState = state
    }

    sendMessage(channelId: ChannelId, message: string) {
        this.client.sendMessage(channelId, message)
    }

    logout() {
        this.client.logout()
    }
}
