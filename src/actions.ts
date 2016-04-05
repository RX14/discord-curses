import {Server, ServerId, Channel, ChannelId, Message} from "./discord"

export enum ActionType {
    CHANGE_CHANNEL,
    ADD_SERVER,
    ADD_CHANNEL,
    LOG_LINE,
    CORK,
    UNCORK,
    CHAT_MESSAGE,
    FOCUS_CHANNEL_LIST,
    TOGGLE_SERVER_COLLAPSE,
    RESIZE_SCREEN,
    FINISH_LOG_LOADING,
    START_LOGIN,
    LOGGED_IN,
    SCROLL_UP
}

export interface Action {
    type: ActionType
    payload: any
    error?: boolean
}

export function changeChannel(id: ChannelId): Action {
    return {
        type: ActionType.CHANGE_CHANNEL,
        payload: {
            channelId: id
        }
    }
}

export function addServer(server: Server): Action {
    return {
        type: ActionType.ADD_SERVER,
        payload: {
            server: server
        }
    }
}

export function addChannel(channel: Channel): Action {
    return {
        type: ActionType.ADD_CHANNEL,
        payload: {
            channel: channel
        }
    }
}

export function logLine(line: String): Action {
    return {
        type: ActionType.LOG_LINE,
        payload: {
            log: line
        }
    }
}

export function cork(): Action {
    return {
        type: ActionType.CORK,
        payload: null
    }
}

export function uncork(): Action {
    return {
        type: ActionType.UNCORK,
        payload: null
    }
}

export function chatMessage(message: Message): Action {
    return {
        type: ActionType.CHAT_MESSAGE,
        payload: {
            message: message
        }
    }
}

export function focusChannelList(): Action {
    return {
        type: ActionType.FOCUS_CHANNEL_LIST,
        payload: null
    }
}

export function toggleServerCollapse(id: ServerId): Action {
    return {
        type: ActionType.TOGGLE_SERVER_COLLAPSE,
        payload: {
            serverId: id
        }
    }
}

export function resizeScreen(width: number, height: number): Action {
    return {
        type: ActionType.RESIZE_SCREEN,
        payload: {
            width: width,
            height: height
        }
    }
}

export function finishLogLoading(): Action {
    return {
        type: ActionType.FINISH_LOG_LOADING,
        payload: null
    }
}

export function startLogin(): Action {
    return {
        type: ActionType.START_LOGIN,
        payload: null
    }
}

export function loggedIn(): Action {
    return {
        type: ActionType.LOGGED_IN,
        payload: null
    }
}

export function loginError(error): Action {
    return {
        type: ActionType.LOGGED_IN,
        payload: error,
        error: true
    }
}

export function scrollUp(lines: number): Action {
    return {
        type: ActionType.SCROLL_UP,
        payload: {
            lines: lines
        }
    }
}
