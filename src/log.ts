import * as winston from "winston"
import {ActionType, Action} from "./actions"
import {State, LoginState} from "./state"
import {Store} from "redux";

export const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: "discord-curses.log",
            level: 'debug',
            colorize: true,
            json: false,
            prettyPrint: true
        })
    ]
})

function debugState(state: State) {
    return {
        // servers: state.servers.toJS(),
        // channels: state.channels.toJS(),
        // serversChannelsRelation: state.serversChannelsRelation.toJS(),
        // log: state.log.toJS(),
        currentChannelId: state.currentChannelId,
        collapsedServers: state.collapsedServers.toJS(),
        screenHeight: state.screenHeight,
        screenWidth: state.screenWidth,
        corked: state.corked,
        channelListFocused: state.channelListFocused,
        loadingChannelLogs: state.loadingChannelLogs,
        loginState: LoginState[state.loginState],
        loginError: state.loginError
    }
}

export const reduxMiddleware = (store: Store<State>) => next => (action: Action) => {
    // Hack to reduce spam from other channels
    let showMessage = true
    if (action.type == ActionType.CHAT_MESSAGE) {
        if (action.payload.message.channel != store.getState().currentChannelId) {
            showMessage = false
        }
    }

    if (showMessage) logger.debug("dispatching", {type: ActionType[action.type], action})
    let result = next(action)
    if (showMessage && !store.getState().corked) logger.debug("next state", debugState(store.getState()))
    return result
}
