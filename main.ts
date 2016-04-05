import {reducers, filterChatMessageMiddleware} from "./src/reducers"
import {createStore, applyMiddleware} from "redux"
import {Display} from "./src/display"
import {DiscordClient} from "./src/discord"
import {reduxMiddleware as logMiddleware} from "./src/log"

export const store = createStore(reducers, applyMiddleware(filterChatMessageMiddleware, logMiddleware))

const display = new Display()
export const discord = new DiscordClient()

// Needed before handlers run to set prevState from initial state
display.render(store.getState())

store.subscribe(() => {
    let state = store.getState()
    discord.handleState(state)
    display.render(state)
})

display.handlers(store)
discord.handlers(store)

discord.login(process.argv[2], process.argv[3], store)
