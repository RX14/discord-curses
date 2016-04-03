const Blessed = require("blessed")
import * as actions from "./actions";
import {State, LoginState} from "./state";
import {Store} from "redux";
import {ServerId, ChannelId} from "./discord";
import {logger} from "./log"
import {discord} from "../main"

interface ChannelServerContainer {
    isServer: boolean
    channelId?: ChannelId
    serverId?: ServerId
}

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
            title: "Discord"
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

            bottom: 2,
            right: 0
        })

        this.chatInput = Blessed.textbox({
            parent: this.screen,

            bottom: 0,
            right: 0,
            height: 1,

            inputOnFocus: true
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

        if (state.log != prevState.log) {
            logger.debug("Updating log")
            this.chat.setItems(state.log.toArray())
            this.chat.setScrollPerc(100)
        }

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
                logger.debug("Focusing channeList")
                this.channelList.focus()
            } else {
                logger.debug("Focusing chatInput")
                this.chatInput.focus()
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
            store.dispatch(actions.resizeScreen(this.screen.width, this.screen.height))
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

        this.chatInput.on("blur", () => {
            store.dispatch(actions.focusChannelList())
        })

        //TODO: disgusting
        this.chatInput.on("submit", () => {
            let text = this.chatInput.value
            discord.sendMessage(store.getState().currentChannelId, text)

            this.chatInput.clearValue()
            this.chatInput.focus()
            this.screen.render()
        })

        this.chatInput.key(["C-c"], () => {
            this.chatInput.clearValue()
            this.screen.render()
        })
    }
}
