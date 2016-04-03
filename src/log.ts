import * as winston from "winston"
import {ActionType} from "./actions"
import {State, LoginState} from "./state";

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

export const reduxMiddleware = store => next => action => {
    // logger.silly("dispatching", {type: ActionType[action.type], action})
    logger.debug("dispatching", {type: ActionType[action.type]})
    let result = next(action)
    logger.silly("next state", debugState(store.getState()))
    return result
}
