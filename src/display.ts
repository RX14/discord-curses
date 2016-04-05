const Blessed = require("blessed")
const unidecode = require("unidecode")
import * as actions from "./actions";
import {State, LoginState} from "./state";
import {Store} from "redux";
import {ServerId, ChannelId} from "./discord";
import {logger} from "./log"
import {discord} from "../main"
import * as utils from "./utils"

interface ChannelServerContainer {
    isServer: boolean
    channelId?: ChannelId
    serverId?: ServerId
}

const padString = "                    "

export class Display {
    private screen
    private channelList
    private channelListSeperator
    private chat
    private chatInput
    private chatInputSeperator
    private loginMessage

    private prevState: State
    private indexContainerMap: Map<number, ChannelServerContainer>

    constructor() {
        this.screen = Blessed.screen({
            smartCSR: true,
            dockBorders: true,
            title: "Discord",
            fullUnicode: true
        })

        this.channelList = Blessed.list({
            parent: this.screen,

            top: 0,
            left: 0,
            height: '100%',

            tags: true,
            keys: true,
            vi: true,
            scrollable: true,

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

        this.channelListSeperator = Blessed.line({
            parent: this.screen,

            top: 0,
            height: '100%',
            orientation: 'vertical'
        })

        this.chat = Blessed.list({
            parent: this.screen,

            scrollable: true,
            alwaysScroll: true,

            bottom: 2,
            right: 0
        })

        this.chatInput = Blessed.textbox({
            parent: this.screen,

            bottom: 0,
            right: 0,
            height: 1
        })

        this.chatInputSeperator = Blessed.line({
            parent: this.screen,

            bottom: 1,
            right: 0,
            orientation: 'horizontal'
        })

        this.loginMessage = Blessed.message({
            parent: this.screen,

            top: "center",
            left: "center",
            height: "shrink",
            width: "half",

            tags: true,
            keys: true,
            hidden: true,

            border: "line"
        })
    }

    render(state: State) {
        if (state.corked) return
        const prevState = this.prevState || state

        if (state.screenWidth != prevState.screenWidth) {
            logger.debug("Updating channelListWidth")
            let channelListWidth = Math.min(Math.floor(this.screen.width * 0.2), 40)
            let chatWidth = this.screen.width - channelListWidth - 1

            this.channelList.width = channelListWidth
            this.channelListSeperator.position.left = channelListWidth
            this.chat.width = chatWidth
            this.chatInput.width = chatWidth
            this.chatInputSeperator.width = chatWidth
        }

        if (state.log != prevState.log
            || state.screenWidth != prevState.screenWidth) {
            logger.debug("Updating log")

            let logs = []
            let maxLineWidth = this.chat.width - 1 - padString.length
            state.log.forEach(message => {
                let usernamePad = utils.pad(padString, `<${unidecode(message.username)}>`)
                let messageLines: string[] = message.content.split("\n")

                messageLines.forEach(line => {
                    if (line.length > maxLineWidth) {
                        while (true) {
                            // Find index of last space, starting with the last possible character which could fit on the screen.
                            let lastSpace = line.lastIndexOf(" ", maxLineWidth)

                            // If we found a space
                            if (lastSpace > 0) {
                                // Cut the line at found space, and append to log.
                                logs.push(`${usernamePad}│${line.substring(0, lastSpace)}`)

                                // Remove the bit we just appended from the string, plus the space.
                                line = line.substring(lastSpace + 1)
                            } else { // else
                                // Cut the line at max width, and append to log.
                                logs.push(`${usernamePad}│${line.substring(0, maxLineWidth)}`)

                                // Remove the bit we just appended from the string
                                line = line.substring(maxLineWidth)
                            }

                            // Set the username to be blank, so the username isn't printed multiple times.
                            usernamePad = padString

                            // If the rest of the message can fit into one line,
                            if (line.length < maxLineWidth) {
                                // append it to the log,
                                logs.push(`${usernamePad}│${line}`)

                                // and break the loop.
                                break
                            }
                        }
                    } else {
                        logs.push(`${usernamePad}│${line}`)
                    }
                })

            })

            this.chat.setItems(logs)
        }

        this.chat.setScroll((this.chat.getScrollHeight() - this.chat.height) - state.scrolledUpLines)

        if (state.serversChannelsRelation != prevState.serversChannelsRelation
            || state.collapsedServers != prevState.collapsedServers) {

            logger.debug("Updating channelList")
            let channelListStrings = []
            let indexContainerMap = new Map<number, ChannelServerContainer>()

            let index
            state.servers.forEach(server => {
                let collapsed = state.collapsedServers.includes(server.id)

                index = channelListStrings.push(`${server.name} [${collapsed ? "+" : "-"}]`) - 1
                indexContainerMap.set(index, {isServer: true, serverId: server.id})
                if (collapsed) return

                let channelIds = state.serversChannelsRelation.get(server.id)
                channelIds.forEach(channelId => {
                    let channel = state.channels.get(channelId)

                    index = channelListStrings.push("├─ " + channel.name) - 1
                    indexContainerMap.set(index, {isServer: false, channelId})
                })
                channelListStrings.push("")
            })

            this.channelList.setItems(channelListStrings)
            this.indexContainerMap = indexContainerMap
        }

        if (state.channelListFocused != prevState.channelListFocused) {
            if (state.channelListFocused) {
                logger.debug("Focusing channelList")
                this.channelList.focus()
            } else {
                logger.debug("Focusing chatInput")
                this.chatInput.focus()
                this.chatInput.input()
            }
        }

        if (state.loadingChannelLogs != prevState.loadingChannelLogs) {
            if (state.loadingChannelLogs) {
                this.chat.add("Loading logs...")
            }
        }

        if (state.loginState != prevState.loginState) {
            if (state.loginState == LoginState.LOGGING_IN) {
                this.loginMessage.setLabel("{blue-fg}Login{/blue-fg}")
                this.loginMessage.display("Logging in...", 9999)
            } else if (state.loginState == LoginState.LOGIN_ERROR) {
                this.loginMessage.setLabel("{red-fg}Login Failed{/red-fg}")
                this.loginMessage.display(`{red-fg}${state.loginError}\nPress any key to exit...{/red-fg}`, 0, () => process.exit(1))
            } else {
                this.loginMessage.hide()
            }
        }

        this.prevState = state
        this.screen.render()
    }

    handlers(store: Store<State>) {
        this.screen.key(["q", "C-c"], () => {
            let question = Blessed.question({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: 'half',
                height: 'shrink',

                keys: true,
                tags: true,

                border: 'line',
                label: ' Quitting '
            })

            question.ask("Are you sure you want to quit?", (err, value) => {
                if (value) {
                    discord.logout()
                    process.exit(0)
                } else {
                    question.destroy()
                    this.screen.render()
                }
            })
        })

        this.screen.on('resize', () => {
            // Use setImmediate so event handlers finish before we send the resize
            setImmediate(() => {
                store.dispatch(actions.resizeScreen(this.screen.width, this.screen.height))
            })
        })
        this.screen.emit('resize')

        this.channelList.on('select', (_, i) => {
            let container = this.indexContainerMap.get(i)

            if (!container) {
                // Selected separator
                return
            }

            if (container.isServer) {
                let serverId = container.serverId
                store.dispatch(actions.toggleServerCollapse(serverId))
            } else {
                let channelId = container.channelId
                store.dispatch(actions.changeChannel(channelId))
            }
        })

        this.channelList.key(["i"], () => {
            this.channelList.enterSelected()
        })

        this.chatInput.key(["escape"], () => {
            store.dispatch(actions.focusChannelList())
        })

        this.chatInput.key(["pageup", "pagedown", "C-up", "C-down"], (_, key) => {
            switch (key.name) {
                case "pageup":
                    if (this.chat.childBase > 0) {
                        store.dispatch(actions.scrollUp(this.chat.height - 2))
                    }
                    break
                case "pagedown":
                    store.dispatch(actions.scrollUp(-(this.chat.height - 2)))
                    break
                case "up":
                    if (key.ctrl && this.chat.childBase > 0) {
                        store.dispatch(actions.scrollUp(1))
                    }
                    break
                case "down":
                    if (key.ctrl) {
                        store.dispatch(actions.scrollUp(-1))
                    }
                    break
            }
        })

        //TODO: disgusting
        this.chatInput.on("submit", () => {
            let text = this.chatInput.value
            if (text.trim().length > 0) {
                discord.sendMessage(store.getState().currentChannelId, text)
            }

            this.chatInput.clearValue()
            this.chatInput.input()
            this.screen.render()
        })

        this.chatInput.key(["C-c"], () => {
            this.chatInput.clearValue()
            this.screen.render()
        })
    }
}
